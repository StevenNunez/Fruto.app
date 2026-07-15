/// <reference types="vite/client" />
import { supabase } from './supabase';
import { Product } from '../types';

export const DEFAULT_CATEGORIES = ['Verduras', 'Frutas', 'Canastas', 'Temporada'];

type DbProduct = {
  id: string;
  name: string;
  price: number;
  unit: string;
  category: string;
  image: string;
  is_season: boolean;
  description: string | null;
  tags: string[] | null;
};

function mapProduct(row: DbProduct): Product {
  return {
    id: row.id,
    name: row.name,
    price: row.price,
    unit: row.unit,
    category: row.category,
    image: row.image,
    isSeason: row.is_season,
    description: row.description ?? undefined,
    tags: row.tags ?? undefined,
  };
}

function toDb(p: Product): DbProduct {
  return {
    id: p.id,
    name: p.name,
    price: p.price,
    unit: p.unit,
    category: p.category,
    image: p.image,
    is_season: p.isSeason ?? false,
    description: p.description ?? null,
    tags: p.tags && p.tags.length > 0 ? p.tags : null,
  };
}

export async function loadProducts(): Promise<Product[]> {
  const { data, error } = await supabase.from('products').select('*').order('name');
  if (error) { console.error('loadProducts:', error.message); return []; }
  return (data as DbProduct[]).map(mapProduct);
}

export async function upsertProduct(product: Product): Promise<void> {
  const { error } = await supabase.from('products').upsert(toDb(product));
  if (error) throw new Error(error.message);
}

export async function deleteProduct(id: string): Promise<void> {
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function loadCategories(): Promise<string[]> {
  const { data } = await supabase.from('categories').select('name').order('name');
  if (!data || data.length === 0) return [...DEFAULT_CATEGORIES];
  return (data as { name: string }[]).map((r) => r.name);
}

export async function saveCategories(cats: string[]): Promise<void> {
  const { error: delErr } = await supabase.from('categories').delete().not('name', 'is', null);
  if (delErr) throw new Error(delErr.message);
  if (cats.length > 0) {
    const { error: insErr } = await supabase.from('categories').insert(cats.map((name) => ({ name })));
    if (insErr) throw new Error(insErr.message);
  }
}

export function newProductId(): string {
  return `p-${Date.now()}`;
}
