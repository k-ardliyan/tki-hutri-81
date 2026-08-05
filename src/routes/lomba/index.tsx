import { createFileRoute } from '@tanstack/react-router'
import LombaPage from '../../components/pages/LombaPage'

export const Route = createFileRoute('/lomba/')({
  component: LombaListPage,
})

function LombaListPage() {
  return <LombaPage />
}
