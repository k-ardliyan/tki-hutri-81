/**
 * StatCard — kartu statistik dashboard (shared).
 * Icon kiri + label + value besar + hint.
 */
import type { LucideIcon } from 'lucide-react'
import { Card, CardContent } from './card'

interface StatCardProps {
  icon: LucideIcon
  iconCls?: string
  label: string
  value: string
  hint?: React.ReactNode
  center?: boolean
}

export default function StatCard({ icon: Icon, iconCls = 'bg-primary/10 text-primary', label, value, hint, center = false }: StatCardProps) {
  return (
    <Card className={center ? 'items-center text-center' : ''}>
      <CardContent className={`${center ? 'py-4 text-center' : ''} flex flex-col gap-1`}>
        <div className={`flex h-9 w-9 items-center justify-center rounded-md ${iconCls} ${center ? 'mx-auto mb-1' : 'mb-1'}`}>
          <Icon size={16} />
        </div>
        <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-2xl font-extrabold tabular-nums text-foreground">{value}</p>
        {hint && <p className="text-[10px] font-medium text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  )
}
