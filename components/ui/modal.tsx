"use client"

/**
 * Modal — a small reusable modal/dialog (built by hand, not shadcn).
 *
 * Named "Modal" to avoid clashing with the existing shadcn `dialog.tsx`
 * (Windows filenames are case-insensitive). Renders a dimmed backdrop + a
 * centred panel; closes on Escape or backdrop click. Dark-academia styling.
 */

import { useEffect, type ReactNode } from "react"

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  // Close on Escape while open.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} aria-hidden />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 mx-4 w-full max-w-md rounded border border-border bg-card p-6 shadow-2xl"
      >
        {title && <h2 className="mb-4 font-serif text-lg italic text-foreground">{title}</h2>}
        {children}
      </div>
    </div>
  )
}
