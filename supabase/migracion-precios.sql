-- =====================================================================
-- fruto.app — Migración del módulo Precios (2026-07-14)
-- Ejecutar UNA VEZ en: Supabase Dashboard → SQL Editor
--
-- Las tablas gastos_fijos y product_costs del schema original no
-- calzaban con los datos reales del módulo Precios (les faltaban campos
-- como costos extra y unidades de compra). Se redefinen en formato
-- {id, data jsonb}. Ambas estaban vacías (el código escribía en
-- localStorage), así que no se pierde nada.
-- =====================================================================

drop table if exists gastos_fijos;
drop table if exists product_costs;

create table gastos_fijos (
  id   text primary key,
  data jsonb not null
);

create table product_costs (
  id   text primary key,
  data jsonb not null
);

-- RLS: solo el admin puede leer y escribir (igual que en policies.sql)
alter table gastos_fijos enable row level security;
alter table product_costs enable row level security;

create policy "gastos_fijos_admin" on gastos_fijos
  for all using (is_admin()) with check (is_admin());

create policy "product_costs_admin" on product_costs
  for all using (is_admin()) with check (is_admin());
