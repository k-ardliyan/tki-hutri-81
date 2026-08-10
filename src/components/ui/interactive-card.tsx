import * as React from "react"
import { Card } from "~/components/ui/card"
import { cn } from "~/lib/utils"

export interface InteractiveCardProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  cardClassName?: string
  children: React.ReactNode
}

export function InteractiveCard({
  children,
  className,
  cardClassName,
  type = "button",
  ...props
}: InteractiveCardProps) {
  return (
    <button
      type={type}
      className={cn(
        "group w-full cursor-pointer text-left transition active:scale-[0.99] focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-xl",
        className
      )}
      {...props}
    >
      <Card
        className={cn(
          "h-full transition-colors group-hover:bg-muted/50 group-hover:border-muted-foreground/30",
          cardClassName
        )}
      >
        {children}
      </Card>
    </button>
  )
}
