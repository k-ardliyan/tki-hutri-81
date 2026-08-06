/**
 * Modal — bottom sheet (mobile) / centered dialog (desktop).
 * Reusable CRUD wrapper. Overlay click + ESC close. Focus trap sederhana.
 */
import { useEffect, useRef } from 'react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  footer?: React.ReactNode
  /** Max width desktop (default max-w-md). */
  maxW?: string
}

export default function Modal({ open, onClose, title, children, footer, maxW = 'max-w-md' }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  // ESC close
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  // Focus trap — focus panel on open
  useEffect(() => {
    if (open && panelRef.current) panelRef.current.focus()
  }, [open])

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-900/40 backdrop-blur-sm sm:items-center"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        className={`w-full ${maxW} max-h-[85dvh] overflow-auto rounded-t-2xl bg-white shadow-2xl outline-none sm:rounded-2xl`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 id="modal-title" className="text-base font-extrabold tracking-tight text-slate-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            aria-label="Tutup"
          >
            <i className="fa-solid fa-xmark text-sm" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-5 py-3">
            {footer}
          </div>
        )}

        {/* Mobile drag indicator */}
        <div className="pointer-events-none flex justify-center pb-2 sm:hidden">
          <div className="h-1 w-10 rounded-full bg-slate-200" />
        </div>
      </div>
    </div>
  )
}
