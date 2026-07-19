import { supabase } from './supabase';
import type { DeliveryMode, Sector, ZonaEntrega } from '../types';

export type Config = {
  businessName: string;
  adminName: string;
  whatsapp: string;
  bankName: string;
  bankRut: string;
  bankAccountName: string;
  cutoffTime: string;
  deliveryTime: string;
  /** Texto de la ventana para pedidos "mañana" (planificados). */
  deliveryWindow: string;
  /** Costo de despacho: se cobra siempre en "hoy", y en "mañana" si no llega al umbral. */
  deliveryFee: number;
  /** Envío gratis solo aplica a pedidos para MAÑANA sobre este monto. */
  freeDeliveryThreshold: number;
  /** Zonas/rutas de entrega editables por el admin (checkout, ruta, filtros). */
  zonas: ZonaEntrega[];
  /** LEGADO: toggles fijos anteriores; solo se usan para derivar zonas si `zonas` no existe. */
  sectors: { la_serena: boolean; coquimbo: boolean; las_companias: boolean };
  paymentMethods: { mercadopago: boolean; transferencia: boolean };
};

/** Ventanas para entrega el mismo día (urgentes). */
export const EXPRESS_DELIVERY_SLOTS = [
  'Lo antes posible',
  '10:00–12:00',
  '12:00–14:00',
  '14:00–16:00',
  '16:00–18:00',
  '18:00–20:00',
] as const;

/**
 * Mañana: gratis si subtotal ≥ umbral; si no, cobra deliveryFee.
 * Hoy (urgente): siempre cobra deliveryFee (la urgencia tiene valor).
 */
export function computeDeliveryFee(
  subtotal: number,
  mode: DeliveryMode,
  config: Pick<Config, 'deliveryFee' | 'freeDeliveryThreshold'>
): number {
  if (mode === 'hoy') return config.deliveryFee;
  return subtotal >= config.freeDeliveryThreshold ? 0 : config.deliveryFee;
}

export function deliveryModeLabel(mode: DeliveryMode): string {
  return mode === 'hoy' ? 'Hoy' : 'Mañana';
}

export function deliverySummary(
  mode: DeliveryMode,
  slot: string | undefined,
  config: Pick<Config, 'deliveryWindow'>
): string {
  if (mode === 'hoy') {
    return slot ? `Hoy · ${slot}` : 'Hoy';
  }
  return `Mañana · ${config.deliveryWindow}`;
}

// Valores neutros de respaldo. Los datos reales del negocio viven en
// Supabase (tabla config, fila id=1) y se editan en /admin/configuracion.
// NUNCA poner aquí datos bancarios, WhatsApp ni nombres reales: esto es
// lo que vería un cliente si la carga desde Supabase falla.
export const DEFAULT_CONFIG: Config = {
  businessName: 'Fruto.app',
  adminName: '',
  whatsapp: '',
  bankName: '',
  bankRut: '',
  bankAccountName: '',
  cutoffTime: '15:00',
  deliveryTime: '18:30',
  deliveryWindow: '7:00 – 10:00 PM',
  deliveryFee: 2500,
  freeDeliveryThreshold: 10000,
  zonas: [
    { id: 'la-serena', nombre: 'La Serena' },
    { id: 'coquimbo', nombre: 'Coquimbo' },
    { id: 'las-companias', nombre: 'Las Compañías' },
  ],
  sectors: { la_serena: true, coquimbo: true, las_companias: true },
  paymentMethods: { mercadopago: true, transferencia: true },
};

const SECTOR_MAP: { key: keyof Config['sectors']; label: string }[] = [
  { key: 'la_serena', label: 'La Serena' },
  { key: 'coquimbo', label: 'Coquimbo' },
  { key: 'las_companias', label: 'Las Compañías' },
];

/** Zonas activas de la config; si la config guardada es anterior a las
 * zonas editables, se derivan de los toggles legados. */
export function getZonas(config: Pick<Config, 'zonas' | 'sectors'>): ZonaEntrega[] {
  if (config.zonas && config.zonas.length > 0) return config.zonas;
  return SECTOR_MAP.filter((s) => config.sectors?.[s.key] !== false).map((s) => ({
    id: s.key,
    nombre: s.label,
  }));
}

export function getActiveSectors(config: Pick<Config, 'zonas' | 'sectors'>): Sector[] {
  return getZonas(config).map((z) => z.nombre);
}

/** "15:00" → "3 PM"; "15:30" → "3:30 PM" (para textos de la tienda). */
export function formatCutoffLabel(cutoffTime: string): string {
  const [hStr, mStr] = cutoffTime.split(':');
  const h = Number(hStr);
  const m = Number(mStr ?? '0');
  if (Number.isNaN(h)) return cutoffTime;
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return m === 0 ? `${h12} ${period}` : `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

// Copia antigua en localStorage (solo existe en el navegador del
// productor). Se usa una única vez como puente de migración mientras
// la fila de Supabase siga vacía; al guardar en /admin/configuracion
// queda todo en Supabase.
function localLegacyConfig(): Partial<Config> {
  try {
    return JSON.parse(localStorage.getItem('fruto_config') ?? '{}');
  } catch {
    return {};
  }
}

// Caché en memoria (5 min): la config se pide en casi todas las páginas;
// solo se cachea una lectura EXITOSA de Supabase (nunca el fallback), y
// guardar desde /admin/configuracion la actualiza al instante.
let configCache: { at: number; data: Config } | null = null;
const CONFIG_TTL_MS = 5 * 60 * 1000;

export async function loadConfig(): Promise<Config> {
  if (configCache && Date.now() - configCache.at < CONFIG_TTL_MS) return configCache.data;
  try {
    const { data, error } = await supabase.from('config').select('data').eq('id', 1).maybeSingle();
    if (error) console.error('loadConfig:', error.message);
    const saved = (data?.data ?? {}) as Partial<Config>;
    if (Object.keys(saved).length > 0) {
      const merged = { ...DEFAULT_CONFIG, ...saved };
      configCache = { at: Date.now(), data: merged };
      return merged;
    }
  } catch (err) {
    console.error('loadConfig:', err);
  }
  return { ...DEFAULT_CONFIG, ...localLegacyConfig() };
}

export async function saveConfig(config: Config): Promise<void> {
  const { error } = await supabase.from('config').upsert({ id: 1, data: config });
  if (error) throw new Error(error.message);
  configCache = { at: Date.now(), data: config };
}
