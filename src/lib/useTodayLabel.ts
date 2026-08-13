/**
 * Hydration-safe "label tanggal hari ini" hook.
 *
 * `new Date()` saat render server ≠ client (timezone/UTC beda, apalagi dini
 * hari) → React #418. Hook ini render string kosong saat SSR/first-paint
 * (deterministik), lalu mengisi via effect setelah hydration. Format function
 * disimpan di ref supaya identitasnya tidak memicu re-render loop.
 *
 * Dipisah dari lib/dateUtils karena file itu juga di-import server-side
 * (src/server/functions/5r.ts) — hook ini client-only.
 */
import * as React from 'react';

export function useTodayLabel(format: (d: Date) => string): string {
  const formatRef = React.useRef(format);
  formatRef.current = format;
  const [label, setLabel] = React.useState('');
  React.useEffect(() => {
    setLabel(formatRef.current(new Date()));
  }, []);
  return label;
}
