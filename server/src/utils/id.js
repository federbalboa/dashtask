/**
 * Genera el siguiente ID incremental con prefijo, p. ej. INT-008.
 */
export function nextId(collection, prefix, pad = 3) {
  const nums = collection
    .map((doc) => {
      const m = String(doc.id || '').match(/(\d+)$/);
      return m ? parseInt(m[1], 10) : 0;
    })
    .filter((n) => !Number.isNaN(n));
  const max = nums.length ? Math.max(...nums) : 0;
  return `${prefix}-${String(max + 1).padStart(pad, '0')}`;
}

export function now() {
  return new Date().toISOString();
}
