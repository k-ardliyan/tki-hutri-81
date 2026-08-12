/**
 * queries.ts — hooks React Query untuk data dashboard (5R + snack + admin).
 * Menghilangkan duplikasi useEffect+useState fetch di tiap halaman.
 */
import { useQuery } from '@tanstack/react-query';
import { getForms, getRooms, getSubmissions } from '../server/functions/5r';
import { listEmployees, listUsers } from '../server/functions/admin';

export const qk = {
  rooms: ['5r', 'rooms'] as const,
  forms: ['5r', 'forms'] as const,
  submissions: ['5r', 'submissions'] as const,
  employees: (q?: string) => ['admin', 'employees', q ?? ''] as const,
  users: ['admin', 'users'] as const,
};

export function useRooms() {
  return useQuery({ queryKey: qk.rooms, queryFn: () => getRooms() });
}

export function useForms() {
  return useQuery({ queryKey: qk.forms, queryFn: () => getForms() });
}

export function useSubmissions() {
  return useQuery({ queryKey: qk.submissions, queryFn: () => getSubmissions() });
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
