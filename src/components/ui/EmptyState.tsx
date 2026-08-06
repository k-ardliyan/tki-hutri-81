/**
 * EmptyState — state kosong konsisten (shared).
 */
import type { LucideIcon } from 'lucide-react'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from './empty'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  hint?: string
  action?: React.ReactNode
  className?: string
}

export default function EmptyState({ icon: Icon, title, hint, action, className = '' }: EmptyStateProps) {
  return (
    <Empty className={className}>
      {Icon && (
        <EmptyMedia>
          <Icon size={24} className="text-muted-foreground/50" />
        </EmptyMedia>
      )}
      <EmptyHeader>
        <EmptyTitle className="text-sm">{title}</EmptyTitle>
      </EmptyHeader>
      {(hint || action) && (
        <EmptyContent>
          {hint && <EmptyDescription className="text-xs">{hint}</EmptyDescription>}
          {action}
        </EmptyContent>
      )}
    </Empty>
  )
}
