/**
 * SectionCards — stat cards pattern dari block dashboard-01.
 * CardHeader: label + value besar + action badge; CardFooter: hint.
 */
import type * as React from "react"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card"

export interface SectionCardData {
  label: string
  value: string
  /** Badge di kanan atas (delta/status). */
  action?: React.ReactNode
  /** Baris hint di bawah. */
  footer?: React.ReactNode
}

export function SectionCards({
  stats,
  gridClass = 'grid-cols-2 lg:grid-cols-4',
}: {
  stats: SectionCardData[]
  gridClass?: string
}) {
  return (
    <div className={`grid gap-3 ${gridClass}`}>
      {stats.map((s) => (
        <Card
          key={s.label}
          className="bg-gradient-to-t from-primary/5 to-card shadow-xs dark:bg-card"
        >
          <CardHeader>
            <CardDescription>{s.label}</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">
              {s.value}
            </CardTitle>
            {s.action && <CardAction>{s.action}</CardAction>}
          </CardHeader>
          {s.footer && (
            <CardFooter className="flex-col items-start gap-1.5 text-sm">
              {s.footer}
            </CardFooter>
          )}
        </Card>
      ))}
    </div>
  )
}
