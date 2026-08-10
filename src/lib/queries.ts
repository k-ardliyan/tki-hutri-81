/**
 * queries.ts — hooks React Query untuk data dashboard (5R + snack + admin).
 * Menghilangkan duplikasi useEffect+useState fetch di tiap halaman.
 */
import { useQuery } from '@tanstack/react-query'
import { getRooms, getForms, getSubmissions } from '../server/functions/5r'
import { getSessions, getRedemptionSummary, getTeamsWithMembers } from '../server/functions/snack'
import { listEmployees, listUsers } from '../server/functions/admin'

export const qk = {
  rooms: ['5r', 'rooms'] as const,
  forms: ['5r', 'forms'] as const,
  submissions: ['5r', 'submissions'] as const,
  sessions: ['snack', 'sessions'] as const,
  redemption: (sessionId?: number) => ['snack', 'redemption', sessionId ?? 'all'] as const,
  teams: ['snack', 'teams'] as const,
  employees: (q?: string) => ['admin', 'employees', q ?? ''] as const,
  users: ['admin', 'users'] as const,
}

export function useRooms() {
  return useQuery({ queryKey: qk.rooms, queryFn: () => getRooms() })
}

export function useForms() {
  return useQuery({ queryKey: qk.forms, queryFn: () => getForms() })
}

export function useSubmissions() {
  return useQuery({ queryKey: qk.submissions, queryFn: () => getSubmissions() })
}

export function useSessions() {
  return useQuery({ queryKey: qk.sessions, queryFn: () => getSessions() })
}

export function useRedemptionSummary(sessionId?: number) {
  return useQuery({
    queryKey: qk.redemption(sessionId),
    queryFn: () => getRedemptionSummary({ data: sessionId ? { sessionId } : {} }),
  })
}

export function useTeamsWithMembers() {
  return useQuery({ queryKey: qk.teams, queryFn: () => getTeamsWithMembers() })
}

export function useEmployees(q?: string) {
  return useQuery({ queryKey: qk.employees(q), queryFn: () => listEmployees({ data: { q, limit: 200 } }) })
}

export function useUsers() {
  return useQuery({ queryKey: qk.users, queryFn: () => listUsers() })
}
