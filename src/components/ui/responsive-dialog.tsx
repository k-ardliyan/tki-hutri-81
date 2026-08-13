import * as React from "react"
import { X } from "lucide-react"
import { useIsMobile } from "~/hooks/use-mobile"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "~/components/ui/dialog"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
  DrawerFooter,
  DrawerClose,
} from "~/components/ui/drawer"
import { Button } from "~/components/ui/button"
import { cn } from "~/lib/utils"

export interface ResponsiveDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: React.ReactNode
  description?: React.ReactNode
  children: React.ReactNode
  footer?: React.ReactNode
  className?: string
  contentClassName?: string
  /**
   * Blok close saat klik backdrop (di luar dialog).
   * Tetap bisa tutup via: tombol Batal/Close (X), Escape (desktop).
   * Dipakai utk form input — cegah input hilang karena salah klik luar.
   */
  blockBackdropClose?: boolean
}

export function ResponsiveDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  className,
  contentClassName,
  blockBackdropClose = false,
}: ResponsiveDialogProps) {
  const isMobile = useIsMobile()

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange} dismissible={!blockBackdropClose}>
        <DrawerContent className={cn("mx-auto max-w-lg", className)}>
          {(title || description) && (
            <div className="relative flex items-start justify-between border-b border-border p-4 shrink-0">
              <div className="space-y-1 min-w-0 pr-8">
                {title && <DrawerTitle className="text-base font-extrabold text-foreground">{title}</DrawerTitle>}
                {description && <DrawerDescription className="text-xs text-muted-foreground">{description}</DrawerDescription>}
              </div>
              <DrawerClose asChild>
                <Button variant="ghost" size="icon-sm" className="absolute top-3.5 right-3 text-muted-foreground hover:text-foreground rounded-full">
                  <X size={16} />
                  <span className="sr-only">Tutup</span>
                </Button>
              </DrawerClose>
            </div>
          )}
          <div className={cn("p-4 overflow-y-auto max-h-[70vh] flex-1", contentClassName)}>{children}</div>
          {footer && <DrawerFooter className="border-t border-border p-4 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] shrink-0">{footer}</DrawerFooter>}
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn("sm:max-w-lg", className)}
        onInteractOutside={blockBackdropClose ? (e) => e.preventDefault() : undefined}
      >
        {(title || description) && (
          <DialogHeader className={cn("gap-1", className?.includes("p-0") && "p-4 sm:px-6 sm:py-4 border-b border-border bg-muted/20")}>
            <DialogTitle>{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
        )}
        <div className={cn("py-2 overflow-y-auto max-h-[70vh]", contentClassName)}>{children}</div>
        {footer && <DialogFooter>{footer}</DialogFooter>}
      </DialogContent>
    </Dialog>
  )
}
