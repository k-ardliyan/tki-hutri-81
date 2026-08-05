import { createFileRoute } from '@tanstack/react-router'
import LombaPage from '../../components/pages/LombaPage'

export const Route = createFileRoute('/lomba/$id')({
  component: LombaDetailPage,
})

function LombaDetailPage() {
  return <LombaPage />
}
