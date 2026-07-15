-- =============================================
-- fruto.app — Supabase Schema
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- =============================================

-- Productos
create table if not exists products (
  id          text primary key,
  name        text not null,
  price       numeric not null,
  unit        text not null,
  category    text not null,
  image       text not null default '',
  is_season   boolean not null default false,
  description text,
  tags        text[],
  created_at  timestamptz default now()
);

-- Categorías
create table if not exists categories (
  name text primary key
);
insert into categories (name) values
  ('Verduras'), ('Frutas'), ('Canastas'), ('Temporada')
on conflict do nothing;

-- Pedidos
create table if not exists orders (
  id               text primary key,
  customer_name    text not null,
  customer_address text not null,
  customer_phone   text,
  customer_sector  text not null,
  items            jsonb not null default '[]',
  total            numeric not null,
  status           text not null default 'Pendiente',
  payment_method   text not null,
  notes            text,
  created_at       timestamptz not null default now()
);

-- Configuración (una sola fila, id siempre = 1)
create table if not exists config (
  id   integer primary key default 1,
  data jsonb not null default '{}'
);
insert into config (id, data) values (1, '{}') on conflict do nothing;

-- Costos operativos
create table if not exists costs (
  id          text primary key,
  date        text not null,
  category    text not null,
  description text not null,
  amount      numeric not null,
  created_at  timestamptz default now()
);

-- Stock inicial por producto
create table if not exists stock (
  product_id    text primary key,
  initial_stock numeric not null default 0
);

-- Gastos fijos (módulo Precios)
create table if not exists gastos_fijos (
  id        text primary key,
  nombre    text not null,
  monto     numeric not null default 0,
  periodo   text not null default 'mensual'
);

-- Costos por producto (módulo Precios)
create table if not exists product_costs (
  product_id text primary key,
  costo_kg   numeric not null default 0,
  merma      numeric not null default 0,
  margen     numeric not null default 30
);
