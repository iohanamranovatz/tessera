"use client"

/**
 * /library — the bookshelf.
 *
 * Lists every book in the library as a grid of <BookCard />s. Clicking a card
 * opens that book's collage view (/book/<id>?tab=collage). The header carries a
 * "+ carte nouă" button that starts the onboarding flow.
 *
 * Data comes from useBooks() (Supabase). While loading we show a few skeleton
 * cards so the page doesn't flash empty.
 */

import { useRouter } from "next/navigation"
import { Plus } from "lucide-react"
import { useBooks } from "@/hooks/use-tessera-data"
import { BookCard } from "@/components/library/BookCard"

export default function LibraryPage() {
  const router = useRouter()
  const { data: books, loading } = useBooks()

  return (
    <div className="min-h-screen paper-texture">
      {/* Header */}
      <header
        className="flex items-center justify-between bg-accent px-4 py-3 sm:px-6"
        style={{ borderBottom: "0.5px solid var(--topbar-border)" }}
      >
        <h1 className="font-serif text-lg italic tracking-wide text-primary sm:text-xl">
          tessera · library
        </h1>
        <button
          onClick={() => router.push("/onboarding")}
          className="flex items-center gap-2 rounded border border-border px-3 py-1.5 font-serif text-xs text-foreground/90 transition-colors hover:bg-secondary/50 sm:text-sm"
        >
          <Plus className="h-3.5 w-3.5" />
          new book
        </button>
      </header>

      {/* Grid */}
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-32 animate-pulse rounded border border-border bg-card/40"
              />
            ))}
          </div>
        ) : books.length === 0 ? (
          <div className="mt-16 flex flex-col items-center gap-4 text-center">
            <p className="font-serif text-base italic text-muted-foreground">
              Your library is empty.
            </p>
            <button
              onClick={() => router.push("/onboarding")}
              className="flex items-center gap-2 rounded border border-border px-4 py-2 font-serif text-sm text-foreground/90 transition-colors hover:bg-secondary/50"
            >
              <Plus className="h-4 w-4" />
              add your first book
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {books.map((book) => (
              <BookCard
                key={book.id}
                book={book}
                onClick={() => router.push(`/book/${book.id}?tab=collage`)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
