import type { Sector } from '../types';

export type Config = {
  businessName: string;
  adminName: string;
  whatsapp: string;
  bankName: string;
  bankRut: string;
  bankAccountName: string;
  cutoffTime: string;
  deliveryTime: string;
  deliveryWindow: string;
  deliveryFee: number;
  freeDeliveryThreshold: number;
  sectors: { la_serena: boolean; coquimbo: boolean; las_companias: boolean };
  paymentMethods: { mercadopago: boolean; transferencia: boolean };
};

export const DEFAULT_CONFIG: Config = {
  businessName: 'Fruto.app',
  adminName: 'Tomás G.',
  whatsapp: '56912345678',
  bankName: 'Banco Estado',
  bankRut: '12.345.678-9',
  bankAccountName: 'Fruto.app',
  cutoffTime: '15:00',
  deliveryTime: '18:30',
  deliveryWindow: '7:00 – 10:00 PM',
  deliveryFee: 2500,
  freeDeliveryThreshold: 10000,
  sectors: { la_serena: true, coquimbo: true, las_companias: true },
  paymentMethods: { mercadopago: true, transferencia: true },
};

const SECTOR_MAP: { key: keyof Config['sectors']; label: Sector }[] = [
  { key: 'la_serena', label: 'La Serena' },
  { key: 'coquimbo', label: 'Coquimbo' },
  { key: 'las_companias', label: 'Las Compañías' },
];

export function getActiveSectors(sectors: Config['sectors']): Sector[] {
  return SECTOR_MAP.filter((s) => sectors[s.key]).map((s) => s.label);
}

export function loadConfig(): Config {
  try {
    const saved = localStorage.getItem('fruto_config');
    if (saved) return { ...DEFAULT_CONFIG, ...JSON.parse(saved) };
  } catch {}
  return DEFAULT_CONFIG;
}

export function saveConfig(config: Config) {
  localStorage.setItem('fruto_config', JSON.stringify(config));
}
