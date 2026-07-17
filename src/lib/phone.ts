/** Valida y normaliza teléfonos móviles chilenos (+56 9 XXXX XXXX). */

export function digitsOnly(input: string): string {
  return input.replace(/\D/g, '');
}

/** Acepta 9XXXXXXXX, 569XXXXXXXX o con espacios/guiones. */
export function isValidChileanMobile(input: string): boolean {
  const d = digitsOnly(input);
  if (d.startsWith('56') && d.length === 11 && d[2] === '9') return true;
  if (d.startsWith('9') && d.length === 9) return true;
  return false;
}

/** Guarda siempre como 569XXXXXXXX (sin +). */
export function normalizeChileanMobile(input: string): string {
  const d = digitsOnly(input);
  if (d.startsWith('56') && d.length === 11) return d;
  if (d.startsWith('9') && d.length === 9) return `56${d}`;
  return d;
}

/**
 * Formatea mientras escribe: "+56 9 1234 5678".
 * Solo decora; el valor canónico va con normalizeChileanMobile.
 */
export function formatChileanMobileInput(input: string): string {
  let d = digitsOnly(input);
  if (d.startsWith('56')) d = d.slice(2);
  if (d.length > 0 && !d.startsWith('9')) {
    // Si pegan un número sin el 9 inicial, no forzar; solo limitar longitud.
  }
  d = d.slice(0, 9);
  if (d.length === 0) return '';
  if (d.length <= 1) return `+56 ${d}`;
  if (d.length <= 5) return `+56 ${d[0]} ${d.slice(1)}`;
  return `+56 ${d[0]} ${d.slice(1, 5)} ${d.slice(5)}`;
}
