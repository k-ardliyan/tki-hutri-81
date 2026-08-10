import { createFileRoute, Outlet } from '@tanstack/react-router'
import { getCompetitions } from '../server/functions/competitions'

export const Route = createFileRoute('/lomba')({
  loader: async () => ({
    competitions: await getCompetitions(),
  }),
  component: LombaLayout,
})

function LombaLayout() {
  return <Outlet />
}