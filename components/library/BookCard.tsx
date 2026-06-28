"use client"

/**
 * BookCard — a single book's card in the /library grid.
 *
 * Purely presentational: it receives a book and renders the dark-academia card.
 * Clicking it opens that book's collage view (the parent handles navigation).
 *
 * Visual rules (matching CharacterCard):
 *  - 3px left border in the book's dominant `coverColor`
 *  - large serif-italic title, small ochre author line
 *  - reading-progress footer "ch. X/Y"
 *  - on hover: brighter border + a subtle lift
 *  - small "×" delete button in the top-right that reveals on hover; clicking
 *    it does NOT open the book (stopPropagation) — it calls `onDelete` instead
 *    so the parent can show a confirmation dialog before erasing.
 */

import { X } from "lucide-react"
import type { Book } from "@/types"

interface BookCardProps {
  book: Book
  onClick: () => void
  /** Optional: when provided, renders a small × in the corner that calls this
   *  with the book. Parent shows the confirmation + actually deletes. */
  onDelete?: (book: Book) => void
}

export function BookCard({ book, onClick, onDelete }: BookCardProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onClick()
      }}
      style={{ borderLeftColor: book.coverColor }}
      className="group relative flex w-full cursor-pointer flex-col gap-2 rounded border border-border border-l-[3px] bg-card/60 p-5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-muted-foreground/60 hover:bg-card focus:outline-none focus:ring-1 focus:ring-muted-foreground/40"
    >
      {onDelete && (
        <button
          type="button"
          aria-label={`Delete ${book.title}`}
          onClick={(e) => {
            e.stopPropagation()
            onDelete(book)
          }}
          className="absolute right-2 top-2 rounded p-1 text-muted-foreground/40 opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-destructive/50"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}

      {/* Dominant-colour swatch + title */}
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          style={{ backgroundColor: book.coverColor }}
          className="mt-1.5 h-8 w-8 flex-shrink-0 rounded-sm border border-border/40"
        />
        <div className="flex flex-col">
          <h3 className="font-serif text-xl italic leading-tight text-foreground">
            {book.title}
          </h3>
          <p className="text-sm italic text-muted-foreground">
            {book.author} · {book.year}
          </p>
        </div>
      </div>

      {/* Reading progress */}
      <p className="mt-3 border-t border-border/40 pt-2 text-xs font-serif text-muted-foreground/80">
        ch. {book.currentChapter}/{book.totalChapters}
      </p>
    </div>
  )
}
