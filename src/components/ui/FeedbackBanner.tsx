/**
 * FeedbackBanner — pesan sukses/error inline (shared).
 */
import { CheckCircle2, TriangleAlert } from 'lucide-react'
import { Alert, AlertDescription } from './alert'

interface FeedbackBannerProps {
  tone: 'success' | 'error'
  children: React.ReactNode
}

export default function FeedbackBanner({ tone, children }: FeedbackBannerProps) {
  return (
    <Alert className={tone === 'success' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}>
      {tone === 'success' ? <CheckCircle2 size={16} /> : <TriangleAlert size={16} />}
      <AlertDescription className="text-xs font-semibold">{children}</AlertDescription>
    </Alert>
  )
}
