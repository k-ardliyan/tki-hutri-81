/**
 * SectionCards — stat cards pattern dari block dashboard-01.
 * CardHeader: label + value besar + action badge; CardFooter: hint.
 */
import type * as React from 'react';
import { Card } from '~/components/ui/card';

export interface SectionCardData {
  label: string;
  value: string;
  /** Badge di kanan atas (delta/status). */
  action?: React.ReactNode;
  /** Baris hint di bawah. */
  footer?: React.ReactNode;
}

export function SectionCards({
  stats,
  gridClass = 'grid-cols-2 lg:grid-cols-4',
}: {
  stats: SectionCardData[];
  gridClass?: string;
}) {
  return (
    <div className={`grid gap-2.5 sm:gap-3 ${gridClass}`}>
      {stats.map((s) => (
        <Card
          key={s.label}
          className="bg-gradient-to-t from-primary/5 to-card shadow-xs dark:bg-card overflow-hidden rounded-2xl border border-border/80"
        >
          <div className="p-3.5 sm:p-4 space-y-1.5">
            {/* Label — Full Width to ensure text is never truncated */}
            <p className="text-xs sm:text-sm font-bold text-muted-foreground leading-snug">
              {s.label}
            </p>

            {/* Value & Action Badge side-by-side */}
            <div className="flex items-center justify-between gap-2 pt-0.5">
              <span className="text-xl sm:text-2xl font-black font-heading tracking-tight tabular-nums text-foreground">
                {s.value}
              </span>
              {s.action && <div className="shrink-0">{s.action}</div>}
            </div>

            {/* Footer */}
            {s.footer && (
              <div className="pt-1 text-[11px] sm:text-xs text-muted-foreground leading-relaxed">
                {s.footer}
              </div>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}
