import * as React from "react"
import { Badge } from "~/components/ui/badge"
import { cn } from "~/lib/utils"

export interface StatusBadgeProps extends Omit<React.ComponentProps<typeof Badge>, "variant"> {
  score?: number | null
  status?: "success" | "warning" | "destructive" | "muted" | "info"
  showScoreMax?: boolean
}

export function StatusBadge({
  score,
  status,
  children,
  className,
  showScoreMax = false,
  ...props
}: StatusBadgeProps) {
  let resolvedStatus: "success" | "warning" | "destructive" | "muted" | "info" = "muted"

  if (status) {
    resolvedStatus = status
  } else if (typeof score === "number" && !isNaN(score)) {
    if (score >= 80) resolvedStatus = "success"
    else if (score >= 60) resolvedStatus = "warning"
    else resolvedStatus = "destructive"
  }

  const toneClass = {
    success: "bg-success/10 text-success border-transparent hover:bg-success/20",
    warning: "bg-warning/10 text-warning border-transparent hover:bg-warning/20",
    destructive: "bg-destructive/10 text-destructive border-transparent hover:bg-destructive/20",
    info: "bg-primary/10 text-primary border-transparent hover:bg-primary/20",
    muted: "bg-muted text-muted-foreground border-transparent",
  }[resolvedStatus]

  const displayContent = children ?? (typeof score === "number" ? `${score}${showScoreMax ? "/100" : ""}` : "--")

  return (
    <Badge
      variant="outline"
      className={cn("font-bold transition-colors", toneClass, className)}
      {...props}
    >
      {displayContent}
    </Badge>
  )
}
