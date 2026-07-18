-- =============================================
-- fruto.app — Migración: Mercado Pago (Checkout Pro)
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- Seguro de re-ejecutar (IF NOT EXISTS).
-- =============================================

alter table orders
  add column if not exists payment_status text not null default 'pendiente_pago';

alter table orders
  add column if not exists mp_preference_id text;

alter table orders
  add column if not exists mp_payment_id text;

comment on column orders.payment_status is
  'pendiente_pago (recién creado, esperando MP) | pagado | pendiente_transferencia | rechazado';
comment on column orders.mp_preference_id is
  'id de la preferencia de pago creada en Mercado Pago (Checkout Pro)';
comment on column orders.mp_payment_id is
  'id del pago real en Mercado Pago, confirmado por el webhook (nunca por el navegador)';

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
