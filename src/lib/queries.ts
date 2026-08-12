/**
 * queries.ts — hooks React Query untuk data dashboard (5R + snack + admin).
 * Menghilangkan duplikasi useEffect+useState fetch di tiap halaman.
 */
import { useQuery } from '@tanstack/react-query';
import { getForms, getRooms, getSubmissions } from '../server/functions/5r';
import { listEmployees, listUsers } from '../server/functions/admin';
import { getBracket } from '../server/functions/bracket';

export const qk = {
  rooms: ['5r', 'rooms'] as const,
  forms: ['5r', 'forms'] as const,
  submissions: ['5r', 'submissions'] as const,
  bracket: (competitionId: number, kategori: string) =>
    ['bracket', competitionId, kategori] as const,
  employees: (q?: string) => ['admin', 'employees', q ?? ''] as const,
  users: ['admin', 'users'] as const,
};

export function useRooms() {
  return useQuery({ queryKey: qk.rooms, queryFn: () => getRooms() });
}

export function useForms() {
  return useQuery({ queryKey: qk.forms, queryFn: () => getForms() });
}

/**
 * Submission 5R/dekorasi — live polling 10s.
 * QueryKey sama utk semua halaman → cache React Query dibagi, invalidate
 * setelah submit langsung menyegarkan halaman lain, interval jadi safety net.
 * initialData opsional: dipakai /live utk SSR first-paint (loader), polling
 * tetap jalan setelah hydrate.
 */
export function useSubmissions(initialData?: Awaited<ReturnType<typeof getSubmissions>>) {
  return useQuery({
    queryKey: qk.submissions,
    queryFn: () => getSubmissions(),
    initialData,
    refetchInterval: 10_000,
  });
}

/**
 * Detail bagan — live polling 10s. Hanya aktif saat komponen mount
 * (halaman /live tab bagan), otomatis pause saat unmount.
 */
export function useBracket(
  competitionId: number,
  kategori: 'putra' | 'putri',
  initialData?: Awaited<ReturnType<typeof getBracket>>
) {
  return useQuery({
    queryKey: qk.bracket(competitionId, kategori),
    queryFn: () => getBracket({ data: { competitionId, kategori } }),
    initialData,
    refetchInterval: 10_000,
  });
}

export function useEmployees(q?: string) {
  return useQuery({
    queryKey: qk.employees(q),
    queryFn: () => listEmployees({ data: { q, limit: 200 } }),
  });
}

export function useUsers() {
  return useQuery({ queryKey: qk.users, queryFn: () => listUsers() });
}
