-- =====================================================================
-- fruto.app — Seguridad (RLS) — Fase 1 del plan de lanzamiento
-- Ejecutar en: Supabase Dashboard → SQL Editor (después de schema.sql)
--
-- PASOS (en este orden):
--   1. Ejecutar este archivo completo en el SQL Editor.
--   2. Crear el usuario admin: Dashboard → Authentication → Users →
--      "Add user" → "Create new user" (tu email y una contraseña segura).
--   3. Registrarlo como admin ejecutando en el SQL Editor
--      (reemplaza el email por el que usaste en el paso 2):
--
--        insert into admins (user_id)
--        select id from auth.users where email = 'TU_EMAIL_AQUI'
--        on conflict do nothing;
--
-- Con esto la base de datos queda cerrada: los visitantes solo pueden
-- ver el catálogo/config/stock y crear pedidos; todo lo demás requiere
-- iniciar sesión como admin en /admin/login.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Tabla de administradores (el productor). "Estar autenticado" NO
-- significa ser admin: cuando existan cuentas de clientes (Fase 4),
-- ellos también estarán autenticados. Admin = estar en esta tabla.
-- ---------------------------------------------------------------------
create table if not exists admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table admins enable row level security;
-- Sin políticas: nadie puede leer/escribir admins directamente desde la
-- API. Solo se consulta vía la función is_admin() (security definer).

create or replace function is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from admins where user_id = auth.uid());
$$;

-- ---------------------------------------------------------------------
-- Activar RLS en todas las tablas
-- ---------------------------------------------------------------------
alter table products      enable row level security;
alter table categories    enable row level security;
alter table orders        enable row level security;
alter table config        enable row level security;
alter table costs         enable row level security;
alter table stock         enable row level security;
alter table gastos_fijos  enable row level security;
alter table product_costs enable row level security;

-- ---------------------------------------------------------------------
-- Catálogo público: cualquiera puede LEER; solo el admin escribe
-- ---------------------------------------------------------------------
drop policy if exists "products_select_public" on products;
create policy "products_select_public" on products
  for select using (true);
drop policy if exists "products_write_admin" on products;
create policy "products_write_admin" on products
  for all using (is_admin()) with check (is_admin());

drop policy if exists "categories_select_public" on categories;
create policy "categories_select_public" on categories
  for select using (true);
drop policy if exists "categories_write_admin" on categories;
create policy "categories_write_admin" on categories
  for all using (is_admin()) with check (is_admin());

drop policy if exists "config_select_public" on config;
create policy "config_select_public" on config
  for select using (true);
drop policy if exists "config_write_admin" on config;
create policy "config_write_admin" on config
  for all using (is_admin()) with check (is_admin());

drop policy if exists "stock_select_public" on stock;
create policy "stock_select_public" on stock
  for select using (true);
drop policy if exists "stock_write_admin" on stock;
create policy "stock_write_admin" on stock
  for all using (is_admin()) with check (is_admin());

-- ---------------------------------------------------------------------
-- Pedidos: cualquiera puede CREAR (checkout sin cuenta), pero solo el
-- admin puede listarlos/modificarlos. El cliente ve SU pedido vía la
-- función get_order() usando el id (UUID no adivinable), y si tiene
-- cuenta, además puede listar sus propios pedidos (orders_select_own).
-- ---------------------------------------------------------------------
drop policy if exists "orders_insert_public" on orders;
create policy "orders_insert_public" on orders
  for insert with check (user_id is null or user_id = auth.uid());
drop policy if exists "orders_select_admin" on orders;
create policy "orders_select_admin" on orders
  for select using (is_admin());
drop policy if exists "orders_select_own" on orders;
create policy "orders_select_own" on orders
  for select using (user_id = auth.uid());
drop policy if exists "orders_update_admin" on orders;
create policy "orders_update_admin" on orders
  for update using (is_admin()) with check (is_admin());
drop policy if exists "orders_delete_admin" on orders;
create policy "orders_delete_admin" on orders
  for delete using (is_admin());

-- ---------------------------------------------------------------------
-- Datos internos del negocio: TODO solo admin
-- ---------------------------------------------------------------------
drop policy if exists "costs_admin" on costs;
create policy "costs_admin" on costs
  for all using (is_admin()) with check (is_admin());

drop policy if exists "gastos_fijos_admin" on gastos_fijos;
create policy "gastos_fijos_admin" on gastos_fijos
  for all using (is_admin()) with check (is_admin());

drop policy if exists "product_costs_admin" on product_costs;
create policy "product_costs_admin" on product_costs
  for all using (is_admin()) with check (is_admin());

-- ---------------------------------------------------------------------
-- get_order(order_id): permite al cliente ver SU pedido en la página de
-- confirmación sin exponer los demás. Seguro porque el id es un UUID
-- imposible de adivinar y solo lo conoce quien hizo el pedido.
-- ---------------------------------------------------------------------
create or replace function get_order(order_id text)
returns setof orders
language sql
stable
security definer
set search_path = public
as $$
  select * from orders where id = order_id;
$$;

-- ---------------------------------------------------------------------
-- stock_remaining(): stock disponible por producto, calculado en la BD.
-- disponible = "tengo ahora" (stock.initial_stock) - reservado por
-- pedidos activos REALES. No reservan: entregados (el trigger de abajo
-- ya los rebajó del stock físico), pagos rechazados, y pedidos MP
-- abandonados (pendiente_pago hace más de 1 hora).
-- Reemplaza el cálculo que hacía la tienda descargando TODOS los
-- pedidos (con datos personales) al navegador de cualquier visitante.
-- ---------------------------------------------------------------------
create or replace function stock_remaining()
returns table (product_id text, remaining numeric)
language sql
stable
security definer
set search_path = public
as $$
  with demand as (
    select item->>'id' as pid, sum((item->>'quantity')::numeric) as qty
    from orders o
    cross join lateral jsonb_array_elements(o.items) as item
    where o.status <> 'Entregado'
      and o.payment_status <> 'rechazado'
      and not (
        o.payment_status = 'pendiente_pago'
        and o.created_at < now() - interval '1 hour'
      )
    group by 1
  )
  select s.product_id, s.initial_stock - coalesce(d.qty, 0)
  from stock s
  left join demand d on d.pid = s.product_id;
$$;

-- ---------------------------------------------------------------------
-- Trigger: al marcar un pedido "Entregado" se descuenta lo entregado de
-- stock.initial_stock ("tengo ahora"); si se revierte el estado, se
-- devuelve. Mantiene el número físico honesto sin trabajo manual.
-- ---------------------------------------------------------------------
create or replace function apply_delivered_stock()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (old.status is distinct from 'Entregado') and new.status = 'Entregado' then
    update stock s
    set initial_stock = greatest(0, s.initial_stock - d.qty)
    from (
      select item->>'id' as pid, sum((item->>'quantity')::numeric) as qty
      from jsonb_array_elements(new.items) as item
      group by 1
    ) d
    where s.product_id = d.pid;
  elsif old.status = 'Entregado' and (new.status is distinct from 'Entregado') then
    update stock s
    set initial_stock = s.initial_stock + d.qty
    from (
      select item->>'id' as pid, sum((item->>'quantity')::numeric) as qty
      from jsonb_array_elements(new.items) as item
      group by 1
    ) d
    where s.product_id = d.pid;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_stock_on_delivery on orders;
create trigger trg_stock_on_delivery
  after update of status on orders
  for each row
  execute function apply_delivered_stock();

-- ---------------------------------------------------------------------
-- Perfiles de cliente (cuentas opcionales): cada uno solo su propia fila
-- ---------------------------------------------------------------------
alter table profiles enable row level security;
drop policy if exists "profiles_select_own" on profiles;
create policy "profiles_select_own" on profiles
  for select using (id = auth.uid());
drop policy if exists "profiles_insert_own" on profiles;
create policy "profiles_insert_own" on profiles
  for insert with check (id = auth.uid());
drop policy if exists "profiles_update_own" on profiles;
create policy "profiles_update_own" on profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- ---------------------------------------------------------------------
-- claim_order(order_id): vincula un pedido hecho como invitado a la
-- cuenta recién creada (solo si el pedido no pertenece a nadie aún).
-- ---------------------------------------------------------------------
create or replace function claim_order(order_id text)
returns void
language sql
security definer
set search_path = public
as $$
  update orders
  set user_id = auth.uid()
  where id = order_id
    and user_id is null
    and auth.uid() is not null;
$$;

grant execute on function get_order(text) to anon, authenticated;
grant execute on function stock_remaining() to anon, authenticated;
grant execute on function is_admin() to anon, authenticated;
grant execute on function claim_order(text) to authenticated;
