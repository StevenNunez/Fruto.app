import { supabase } from './supabase';

export type Frecuencia = 'mensual' | 'anual';

export type GastoFijo = {
  id: string;
  name: string;
  amount: number;
  frecuencia: Frecuencia;
};

export type ExtraCosto = {
  id: string;
  name: string;
  amount: number;
};

export type ProductoCosto = {
  id: string;
  name: string;
  purchaseCost: number;
  bulkUnit: string;
  bulkQty: number;
  sellUnit: string;
  merma: number; // % pérdida
  extraCosts: ExtraCosto[];
  sellPrice: number;
};

// Las tablas gastos_fijos y product_costs guardan cada ítem como una fila
// {id, data jsonb} (ver supabase/schema.sql). Solo el admin puede leer y
// escribir (RLS).

type Row = { id: string; data: unknown };

async function loadAll<T>(table: 'gastos_fijos' | 'product_costs', legacyKey: string): Promise<T[]> {
  const { data, error } = await supabase.from(table).select('id, data');
  if (error) {
    console.error(`${table}:`, error.message);
    return [];
  }
  if (data && data.length > 0) return (data as Row[]).map((r) => r.data as T);
  // Puente de migración: si Supabase está vacío pero hay una copia antigua
  // en localStorage (solo existe en el navegador del productor), usarla y
  // subirla a Supabase de inmediato.
  try {
    const legacy = JSON.parse(localStorage.getItem(legacyKey) ?? '[]') as (T & { id: string })[];
    if (legacy.length > 0) {
      supabase
        .from(table)
        .upsert(legacy.map((item) => ({ id: item.id, data: item })))
        .then(({ error: upError }) => {
          if (upError) console.error(`migración ${table}:`, upError.message);
        });
    }
    return legacy;
  } catch {
    return [];
  }
}

// La UI de Precios guarda la lista completa en cada cambio (incluso
// arrastrando el slider de merma), así que el upsert espera a que el
// usuario haga una pausa para no saturar la red.
const timers: Partial<Record<string, ReturnType<typeof setTimeout>>> = {};
function upsertAllDebounced(table: string, items: { id: string }[]) {
  clearTimeout(timers[table]);
  timers[table] = setTimeout(async () => {
    if (items.length === 0) return;
    const { error } = await supabase.from(table).upsert(items.map((i) => ({ id: i.id, data: i })));
    if (error) console.error(`${table}:`, error.message);
  }, 600);
}

async function deleteRow(table: string, id: string) {
  const { error } = await supabase.from(table).delete().eq('id', id);
  if (error) console.error(`${table}:`, error.message);
}

export const loadGastosFijos = () => loadAll<GastoFijo>('gastos_fijos', 'fruto_gastos_fijos');
export const saveGastosFijos = (gastos: GastoFijo[]) => upsertAllDebounced('gastos_fijos', gastos);
export const deleteGastoFijo = (id: string) => deleteRow('gastos_fijos', id);

export const loadProductosCosto = () => loadAll<ProductoCosto>('product_costs', 'fruto_product_costs');
export const saveProductosCosto = (productos: ProductoCosto[]) => upsertAllDebounced('product_costs', productos);
export const deleteProductoCosto = (id: string) => deleteRow('product_costs', id);

// Guarda UNA fila de costo (con debounce por producto). Desde la
// sincronización con el catálogo, el id de la fila ES el id del producto
// del catálogo — así los costos siguen al producto real de la tienda.
const rowTimers: Partial<Record<string, ReturnType<typeof setTimeout>>> = {};
export function upsertProductoCosto(p: ProductoCosto): void {
  clearTimeout(rowTimers[p.id]);
  rowTimers[p.id] = setTimeout(async () => {
    const { error } = await supabase.from('product_costs').upsert({ id: p.id, data: p });
    if (error) console.error('product_costs:', error.message);
  }, 500);
}
