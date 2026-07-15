/// <reference types="vite/client" />
import { supabase } from './supabase';
import { CostEntry } from '../types';

export async function loadCosts(): Promise<CostEntry[]> {
  const { data, error } = await supabase
    .from('costs')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) { console.error('loadCosts:', error.message); return []; }
  return (data as Record<string, unknown>[]).map((row) => ({
    id: row.id as string,
    date: row.date as string,
    category: row.category as CostEntry['category'],
    description: row.description as string,
    amount: row.amount as number,
  }));
}

export async function addCost(entry: CostEntry): Promise<void> {
  const { error } = await supabase.from('costs').insert({
    id: entry.id,
    date: entry.date,
    category: entry.category,
    description: entry.description,
    amount: entry.amount,
  });
  if (error) throw new Error(error.message);
}

export async function deleteCost(id: string): Promise<void> {
  const { error } = await supabase.from('costs').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
