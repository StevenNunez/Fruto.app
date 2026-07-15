/// <reference types="vite/client" />
import { supabase } from './supabase';
import { Order } from '../types';

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
};

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
  };
}

export async function loadOrders(): Promise<Order[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) { console.error('loadOrders:', error.message); return []; }
  return (data as DbOrder[]).map(mapOrder);
}

export async function loadOrderById(id: string): Promise<Order | null> {
  const { data } = await supabase.from('orders').select('*').eq('id', id).single();
  return data ? mapOrder(data as DbOrder) : null;
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
