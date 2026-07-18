-- =============================================
-- fruto.app — Migración: cuentas de cliente (opcionales)
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- Seguro de re-ejecutar.
--
-- ADEMÁS (una sola vez, fuera del SQL): para que la cuenta se cree al
-- instante sin pedir confirmación por correo, ir a Dashboard →
-- Authentication → Sign In / Providers → Email y DESACTIVAR
-- "Confirm email". Si se deja activado, el cliente deberá abrir un
-- correo de confirmación antes de poder usar su cuenta.
-- =============================================

-- Perfil de cliente: datos de entrega guardados para precargar el checkout.
-- id = auth.uid() del cliente. El admin NO usa esta tabla.
create table if not exists profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  name       text not null default '',
  phone      text not null default '',
  address    text not null default '',
  sector     text not null default 'La Serena',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table profiles enable row level security;

-- Cada cliente lee y escribe SOLO su propia fila.
drop policy if exists "profiles_select_own" on profiles;
create policy "profiles_select_own" on profiles
  for select using (id = auth.uid());
drop policy if exists "profiles_insert_own" on profiles;
create policy "profiles_insert_own" on profiles
  for insert with check (id = auth.uid());
drop policy if exists "profiles_update_own" on profiles;
create policy "profiles_update_own" on profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- Pedidos de clientes con cuenta: user_id nullable (invitados quedan null).
alter table orders
  add column if not exists user_id uuid references auth.users (id) on delete set null;

comment on column orders.user_id is
  'null = pedido de invitado; con valor = pedido vinculado a la cuenta del cliente';

-- El cliente puede VER sus propios pedidos (además del admin, que ya
-- tiene su política; las políticas de select se combinan con OR).
drop policy if exists "orders_select_own" on orders;
create policy "orders_select_own" on orders
  for select using (user_id = auth.uid());

-- Endurecer el INSERT público: un invitado inserta con user_id null y un
-- cliente con sesión solo puede vincularse a sí mismo (nunca a otro).
drop policy if exists "orders_insert_public" on orders;
create policy "orders_insert_public" on orders
  for insert with check (user_id is null or user_id = auth.uid());

-- claim_order: tras crear la cuenta en la página de confirmación, vincula
-- el pedido recién hecho (como invitado) a la cuenta nueva. Seguro porque
-- exige sesión, el id del pedido es un UUID no adivinable y solo funciona
-- sobre pedidos que aún no pertenecen a nadie.
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

grant execute on function claim_order(text) to authenticated;
