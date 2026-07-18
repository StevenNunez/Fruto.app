import { supabase } from './supabase';
import type { Order } from '../types';

export type StockInit = Record<string, number>;

// Regla espejo de stock_remaining() en la BD (policies.sql): qué pedidos
// reservan stock. Mantener ambas sincronizadas si se cambia una.
// No reservan: entregados (el trigger ya los rebajó del stock físico),
// pagos rechazados, y pedidos MP abandonados (>1 hora sin pagar).
const RESERVA_PENDIENTE_PAGO_MS = 60 * 60 * 1000;

export function orderReservesStock(o: Order): boolean {
  if (o.status === 'Entregado') return false;
  if (o.paymentStatus === 'rechazado') return false;
  if (
    o.paymentStatus === 'pendiente_pago' &&
    Date.now() - new Date(o.createdAt).getTime() > RESERVA_PENDIENTE_PAGO_MS
  ) {
    return false;
  }
  return true;
}

export async function loadStockInit(): Promise<StockInit> {
  const { data } = await supabase.from('stock').select('product_id, initial_stock');
  if (!data) return {};
  return Object.fromEntries(
    (data as { product_id: string; initial_stock: number }[]).map((r) => [
      r.product_id,
      r.initial_stock,
    ])
  );
}

// Stock disponible por producto, calculado en la base de datos (RPC
// security definer) para no exponer los pedidos al público.
export async function loadStockRemaining(): Promise<Record<string, number>> {
  const { data, error } = await supabase.rpc('stock_remaining');
  if (error) {
    console.error('stock_remaining:', error.message);
    throw new Error(error.message);
  }
  if (!data) return {};
  return Object.fromEntries(
    (data as { product_id: string; remaining: number }[]).map((r) => [r.product_id, r.remaining])
  );
}

/** true si la cantidad pedida supera el stock restante (si no hay dato de stock, no bloquea). */
export function exceedsStock(
  productId: string,
  quantity: number,
  stockRemaining: Record<string, number>
): boolean {
  if (!(productId in stockRemaining)) return false;
  return quantity > stockRemaining[productId];
}

export async function setStock(productId: string, initialStock: number): Promise<void> {
  await supabase
    .from('stock')
    .upsert({ product_id: productId, initial_stock: initialStock });
}

export async function saveStockInit(stock: StockInit): Promise<void> {
  const rows = Object.entries(stock).map(([product_id, initial_stock]) => ({
    product_id,
    initial_stock,
  }));
  if (rows.length === 0) return;
  await supabase.from('stock').upsert(rows);
}
