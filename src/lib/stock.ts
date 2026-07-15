import { supabase } from './supabase';

export type StockInit = Record<string, number>;

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
  if (error || !data) {
    if (error) console.error('stock_remaining:', error.message);
    return {};
  }
  return Object.fromEntries(
    (data as { product_id: string; remaining: number }[]).map((r) => [r.product_id, r.remaining])
  );
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
