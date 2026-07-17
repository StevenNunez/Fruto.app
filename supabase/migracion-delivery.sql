-- =============================================
-- fruto.app — Migración: modo de entrega (hoy / mañana)
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- Seguro de re-ejecutar (IF NOT EXISTS).
-- =============================================

alter table orders
  add column if not exists delivery_mode text not null default 'manana';

alter table orders
  add column if not exists delivery_slot text;

comment on column orders.delivery_mode is
  'manana = planificado (envío gratis sobre umbral); hoy = urgente (siempre paga despacho)';

comment on column orders.delivery_slot is
  'Ventana horaria preferida solo para delivery_mode = hoy';

-- get_order ya es "returns setof orders", así que expone las columnas nuevas
-- sin cambios. Re-crear por si el proyecto tiene una versión antigua fija:
create or replace function get_order(order_id text)
returns setof orders
language sql
security definer
set search_path = public
as $$
  select * from orders where id = order_id;
$$;

grant execute on function get_order(text) to anon, authenticated;
