// Caché en memoria con vencimiento corto. Evita re-pedir a Supabase los
// mismos datos al navegar entre páginas (Home → Catálogo → Carrito...):
// dentro de la ventana, la página renderiza al instante con el dato ya
// cargado. También deduplica peticiones simultáneas (dos componentes
// pidiendo productos a la vez = una sola petición).
// Los errores NUNCA se cachean.

const entries = new Map<string, { at: number; data: unknown }>();
const pending = new Map<string, Promise<unknown>>();

export async function cached<T>(
  key: string,
  ttlMs: number,
  fetcher: () => Promise<T>
): Promise<T> {
  const hit = entries.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return hit.data as T;

  const inflight = pending.get(key);
  if (inflight) return inflight as Promise<T>;

  const p = fetcher()
    .then((data) => {
      entries.set(key, { at: Date.now(), data });
      pending.delete(key);
      return data;
    })
    .catch((err) => {
      pending.delete(key);
      throw err;
    });
  pending.set(key, p);
  return p;
}

/** Borra claves del caché (llamar tras guardar cambios en esa tabla). */
export function invalidate(...keys: string[]): void {
  for (const k of keys) entries.delete(k);
}

/** Sobrescribe una clave con un valor ya conocido (tras guardar). */
export function prime<T>(key: string, data: T): void {
  entries.set(key, { at: Date.now(), data });
}
