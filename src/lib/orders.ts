/// <reference types="vite/client" />
import { supabase } from './supabase';
import { DeliveryMode, Order } from '../types';

type DbOrder = {
  id: string;
  customer_name: string;
  customer_address: string;
  customer_phone: string | null;
  customer_sector: string;
  items: unknown;
  total: number;
  status: string;
  payment_method: string;
  notes: string | null;
  created_at: string;
  delivery_mode: string | null;
  delivery_slot: string | null;
};

function mapDeliveryMode(raw: string | null | undefined): DeliveryMode {
  return raw === 'hoy' ? 'hoy' : 'manana';
}

function mapOrder(row: DbOrder): Order {
  return {
    id: row.id,
    customerName: row.customer_name,
    customerAddress: row.customer_address,
    customerPhone: row.customer_phone ?? undefined,
    customerSector: row.customer_sector as Order['customerSector'],
    items: row.items as Order['items'],
    total: row.total,
    status: row.status as Order['status'],
    paymentMethod: row.payment_method as Order['paymentMethod'],
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    deliveryMode: mapDeliveryMode(row.delivery_mode),
    deliverySlot: row.delivery_slot ?? undefined,
  };
}

function toDb(o: Order): DbOrder {
  return {
    id: o.id,
    customer_name: o.customerName,
    customer_address: o.customerAddress,
    customer_phone: o.customerPhone ?? null,
    customer_sector: o.customerSector,
    items: o.items,
    total: o.total,
    status: o.status,
    payment_method: o.paymentMethod,
    notes: o.notes ?? null,
    created_at: o.createdAt,
    delivery_mode: o.deliveryMode,
    delivery_slot: o.deliverySlot ?? null,
  };
}

export async function loadOrders(): Promise<Order[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) {
    console.error('loadOrders:', error.message);
    return [];
  }
  return (data as DbOrder[]).map(mapOrder);
}

// Usa la RPC get_order (security definer): con RLS activo el público no
// puede hacer SELECT sobre orders, pero sí ver SU pedido conociendo el id.
export async function loadOrderById(id: string): Promise<Order | null> {
  const { data, error } = await supabase.rpc('get_order', { order_id: id });
  if (error) {
    console.error('get_order:', error.message);
    return null;
  }
  const row = (data as DbOrder[] | null)?.[0];
  return row ? mapOrder(row) : null;
}

export async function createOrder(order: Order): Promise<void> {
  const { error } = await supabase.from('orders').insert(toDb(order));
  if (error) throw new Error(error.message);
}

export async function updateOrderStatus(id: string, status: Order['status']): Promise<void> {
  const { error } = await supabase.from('orders').update({ status }).eq('id', id);
  if (error) throw new Error(error.message);
}

export function formatCLP(value: number): string {
  return `$${value.toLocaleString('es-CL')}`;
}

// Los ids son UUIDs (no adivinables); al mostrarlos como "número de
// pedido" se usan solo los primeros 8 caracteres.
export function shortOrderId(id: string): string {
  return id.slice(0, 8).toUpperCase();
}
