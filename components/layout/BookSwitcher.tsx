"use client"

/**
 * BookSwitcher — a small dropdown that lists every book in the library and
 * navigates to the chosen one.
 *
 * Navigation uses Next.js routing: picking a book pushes
 *   /book/<id>?tab=<currentTab>
 * so the reader stays on the same view (collage/characters/relations) after
 * switching books. The dropdown is hand-built (button + absolute list) and
 * closes on outside click or Escape.
 */

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronDown, Check, Plus, Library } from "lucide-react"
import { useBooks } from "@/hooks/use-tessera-data"
import type { Tab } from "./TabNavigation"

interface BookSwitcherProps {
  /** The currently open book's id. */
  currentBookId: string
  /** Title to show on the button (so we don't wait for the list to load). */
  currentTitle: string
  /** Active tab, preserved across the switch. */
  activeTab: Tab
}

export function BookSwitcher({ currentBookId, currentTitle, activeTab }: BookSwitcherProps) {
  const router = useRouter()
  const { data: books } = useBooks()
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Close on outside click or Escape.
  useEffect(() => {
    if (!open) return
    function onClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", onClick)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onClick)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  function selectBook(bookId: string) {
    setOpen(false)
    if (bookId !== currentBookId) {
      router.push(`/book/${bookId}?tab=${activeTab}`)
    }
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded border border-border px-3 py-1.5 transition-colors hover:bg-secondary/50"
      >
        <span className="font-serif text-xs text-foreground/90 sm:text-sm">{currentTitle}</span>
        <ChevronDown className="h-3 w-3 text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute left-0 z-50 mt-1 w-64 overflow-hidden rounded border border-border bg-popover shadow-xl">
          {books.length === 0 && (
            <p className="px-3 py-2 font-serif text-xs italic text-muted-foreground">
              no books found…
            </p>
          )}
          {books.map((book) => (
            <button
              key={book.id}
              onClick={() => selectBook(book.id)}
              className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left transition-colors hover:bg-secondary/60"
            >
              <span className="flex flex-col">
                <span className="font-serif text-sm italic text-foreground">{book.title}</span>
                <span className="font-serif text-xs text-muted-foreground">{book.author}</span>
              </span>
              {book.id === currentBookId && <Check className="h-3.5 w-3.5 text-primary" />}
            </button>
          ))}

          {/* Footer: library + add-new actions */}
          <div className="border-t border-border">
            <button
              onClick={() => {
                setOpen(false)
                router.push("/library")
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-secondary/60"
            >
              <Library className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-serif text-sm italic text-foreground">library</span>
            </button>
            <button
              onClick={() => {
                setOpen(false)
                router.push("/onboarding")
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-secondary/60"
            >
              <Plus className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-serif text-sm italic text-foreground">new book</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
