import { createFileRoute } from '@tanstack/react-router'
import TimPage from '../components/pages/TimPage'

export const Route = createFileRoute('/tim')({
  component: TimPageWrapper,
})

function TimPageWrapper() {
  return <TimPage />
}
