import { supabase } from './supabase';
import type { Profile, Sector } from '../types';

type DbProfile = {
  id: string;
  name: string;
  phone: string;
  address: string;
  sector: string;
};

// Las zonas ahora son dinámicas (config.zonas): se acepta cualquier
// texto guardado; el checkout valida contra las zonas activas al usarlo.
function mapSector(raw: string): Sector {
  return raw || 'La Serena';
}

async function myUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export async function loadMyProfile(): Promise<Profile | null> {
  const uid = await myUserId();
  if (!uid) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, phone, address, sector')
    .eq('id', uid)
    .maybeSingle();
  if (error) {
    console.error('loadMyProfile:', error.message);
    return null;
  }
  if (!data) return null;
  const row = data as DbProfile;
  return { name: row.name, phone: row.phone, address: row.address, sector: mapSector(row.sector) };
}

export async function saveMyProfile(profile: Profile): Promise<void> {
  const uid = await myUserId();
  if (!uid) throw new Error('Sin sesión iniciada');
  const { error } = await supabase.from('profiles').upsert({
    id: uid,
    name: profile.name,
    phone: profile.phone,
    address: profile.address,
    sector: profile.sector,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
}

// Vincula un pedido hecho como invitado a la cuenta recién creada.
// Solo funciona sobre pedidos sin dueño (ver claim_order en policies.sql).
export async function claimOrder(orderId: string): Promise<void> {
  const { error } = await supabase.rpc('claim_order', { order_id: orderId });
  if (error) console.error('claim_order:', error.message);
}
