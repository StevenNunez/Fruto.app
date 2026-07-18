-- =============================================
-- fruto.app — Migración: cálculo de stock correcto
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- Seguro de re-ejecutar.
--
-- Arregla dos problemas:
--  1. Al marcar un pedido como "Entregado", lo entregado ahora se
--     descuenta de stock.initial_stock ("tengo ahora"). Antes la
--     cantidad "volvía" a aparecer como disponible.
--  2. Los pedidos con pago rechazado, y los pedidos MercadoPago
--     abandonados (pendiente_pago hace más de 1 hora), ya no
--     reservan stock para siempre.
--
-- IMPORTANTE después de ejecutar: entrar a /admin/cosechas y cargar
-- el stock real de cada producto ("tengo ahora") contando lo físico.
-- Sin ese número inicial el sistema no puede descontar nada.
-- =============================================

-- 1. Trigger: al pasar a "Entregado" se rebaja el stock físico; si el
-- admin revierte el estado por error, se devuelve.
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

-- 2. stock_remaining(): disponible = tengo ahora - reservado por pedidos
-- activos REALES. No reservan: pedidos entregados (ya rebajados por el
-- trigger), pagos rechazados, y pedidos MP abandonados (>1 hora sin pagar).
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

grant execute on function stock_remaining() to anon, authenticated;
