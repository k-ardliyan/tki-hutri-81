import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/lomba')({
  component: LombaLayout,
})

function LombaLayout() {
  return <Outlet />
}
