import * as React from "react"
import { cn } from "~/lib/utils"

export interface PageHeaderProps extends React.ComponentProps<"section"> {
  title: string
  subtitle?: React.ReactNode
  action?: React.ReactNode
}

export function PageHeader({
  title,
  subtitle,
  action,
  className,
  ...props
}: PageHeaderProps) {
  return (
    <section
      className={cn("flex flex-wrap items-end justify-between gap-3", className)}
      {...props}
    >
      <div>
        <h1 className="text-lg font-extrabold tracking-tight text-foreground sm:text-xl">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </section>
  )
}
