import { createFileRoute } from '@tanstack/react-router'
import RundownPage from '../components/pages/RundownPage'

export const Route = createFileRoute('/rundown')({
  component: RundownPageWrapper,
})

function RundownPageWrapper() {
  return <RundownPage />
}
