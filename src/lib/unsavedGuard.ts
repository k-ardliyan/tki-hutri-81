/**
 * Unsaved-form guard — tiny module store (client-only usage).
 *
 * ScoringForm set dirty saat user mulai mengisi; AppShell membaca untuk
 * memblokir navigasi keluar dengan dialog konfirmasi. Draft tetap auto-save
 * di localStorage, jadi guard ini murni pencegahan accidental-tap.
 */

let dirty = false;
let listener: ((d: boolean) => void) | null = null;

export function setFormDirty(d: boolean) {
  dirty = d;
  listener?.(d);
}

export function isFormDirty() {
  return dirty;
}

export function subscribeFormDirty(fn: (d: boolean) => void) {
  listener = fn;
  return () => {
    if (listener === fn) listener = null;
  };
}
