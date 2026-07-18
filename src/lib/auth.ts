import { supabase } from './supabase';
import type { Session } from '@supabase/supabase-js';

export async function signIn(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
}

// Registro de clientes (cuentas opcionales, Fase 4). Si en Supabase está
// activada la confirmación por correo, la sesión llega null hasta que el
// cliente confirme; needsEmailConfirm avisa a la UI para explicarlo.
export async function signUp(
  email: string,
  password: string
): Promise<{ needsEmailConfirm: boolean }> {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw new Error(error.message);
  return { needsEmailConfirm: !data.session };
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

export async function getSession(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export function onAuthChange(callback: (session: Session | null) => void): () => void {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => callback(session));
  return () => data.subscription.unsubscribe();
}
