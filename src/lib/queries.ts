/**
 * queries.ts — hooks React Query untuk data dashboard (5R + snack + admin).
 * Menghilangkan duplikasi useEffect+useState fetch di tiap halaman.
 */
import { useQuery } from '@tanstack/react-query';
import { getForms, getRooms, getSubmissions } from '../server/functions/5r';
import { listEmployees, listUsers } from '../server/functions/admin';
import { getBracket } from '../server/functions/bracket';
import { getHeatBracket } from '../server/functions/bracket-heat';

export const qk = {
  rooms: ['5r', 'rooms'] as const,
  forms: ['5r', 'forms'] as const,
  submissions: ['5r', 'submissions'] as const,
  bracket: (competitionId: number, kategori: string) =>
    ['bracket', competitionId, kategori] as const,
  heatBracket: (competitionId: number, kategori: string) =>
    ['heat-bracket', competitionId, kategori] as const,
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
 * Submission 5R/dekorasi — data loader (SSR first-paint) + refetch manual.
 * Polling otomatis dimatikan (2026-08): tiap client polling 10s = beban besar
 * pada pool Aiven (max_connections=20) saat banyak panitia buka /live;
 * refresh manual via tombol Segarkan di /live (useQuery.refetch).
 */
export function useSubmissions(initialData?: Awaited<ReturnType<typeof getSubmissions>>) {
  return useQuery({
    queryKey: qk.submissions,
    queryFn: () => getSubmissions(),
    initialData,
  });
}

/**
 * Detail bagan — refetch manual (polling otomatis dimatikan, lihat
 * useSubmissions). Hanya aktif saat komponen mount (halaman /live tab bagan).
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
  });
}

/** Detail bagan HEAT — refetch manual (sama pola dgn useBracket). */
export function useHeatBracket(
  competitionId: number,
  kategori: 'putra' | 'putri',
  initialData?: Awaited<ReturnType<typeof getHeatBracket>>
) {
  return useQuery({
    queryKey: qk.heatBracket(competitionId, kategori),
    queryFn: () => getHeatBracket({ data: { competitionId, kategori } }),
    initialData,
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
