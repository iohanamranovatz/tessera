"use client"

/**
 * /library — the bookshelf.
 *
 * Lists every book in the library as a grid of <BookCard />s. Clicking a card
 * opens that book's collage view (/book/<id>?tab=collage). The header carries a
 * "+ new book" button that starts the onboarding flow.
 *
 * Each card has a small × button that opens a confirmation dialog. Confirming
 * deletes the book + all its characters/relationships/fragments (cascade via
 * the FK constraints in supabase/schema.sql). This is our minimal GDPR
 * "right to erasure" affordance until per-user auth lands.
 *
 * Data comes from useBooks() (Supabase). While loading we show a few skeleton
 * cards so the page doesn't flash empty.
 */

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, LogOut } from "lucide-react"
import { useBooks, deleteBook } from "@/hooks/use-tessera-data"
import { BookCard } from "@/components/library/BookCard"
import { RequireAuth } from "@/components/auth/RequireAuth"
import { useAuth } from "@/context/AuthContext"
import type { Book } from "@/types"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export default function LibraryPage() {
  const router = useRouter()
  const { data: books, loading, refetch } = useBooks()
  const { user, signOut } = useAuth()

  async function handleSignOut() {
    await signOut()
    router.replace("/login")
  }

  // Cartea pe care urmează să o ștergem, sau null dacă dialogul e închis.
  const [pendingDelete, setPendingDelete] = useState<Book | null>(null)
  // Ține un "in-flight" ca să dezactivăm butonul confirmării și să evităm dublul click.
  const [deleting, setDeleting] = useState(false)
  // Mesaj de eroare local, dacă apelul Supabase pică.
  const [deleteError, setDeleteError] = useState<string | null>(null)

  async function confirmDelete() {
    if (!pendingDelete || deleting) return
    setDeleting(true)
    setDeleteError(null)
    try {
      await deleteBook(pendingDelete.id)
      setPendingDelete(null)
      await refetch()
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Couldn't delete the book.")
    } finally {
      setDeleting(false)
    }
  }

  return (
    <RequireAuth>
    <div className="min-h-screen paper-texture">
      {/* Header */}
      <header
        className="flex items-center justify-between gap-3 bg-accent px-4 py-3 sm:px-6"
        style={{ borderBottom: "0.5px solid var(--topbar-border)" }}
      >
        <h1 className="font-serif text-lg italic tracking-wide text-primary sm:text-xl">
          tessera · library
        </h1>
        <div className="flex items-center gap-2 sm:gap-3">
          {user?.email && (
            <span className="hidden font-serif text-xs italic text-muted-foreground sm:inline">
              {user.email}
            </span>
          )}
          <button
            onClick={() => router.push("/onboarding")}
            className="flex items-center gap-2 rounded border border-border px-3 py-1.5 font-serif text-xs text-foreground/90 transition-colors hover:bg-secondary/50 sm:text-sm"
          >
            <Plus className="h-3.5 w-3.5" />
            new book
          </button>
          <button
            onClick={handleSignOut}
            title="Sign out"
            aria-label="Sign out"
            className="flex items-center gap-2 rounded border border-border px-3 py-1.5 font-serif text-xs text-foreground/90 transition-colors hover:bg-secondary/50 sm:text-sm"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">sign out</span>
          </button>
        </div>
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
                onDelete={setPendingDelete}
              />
            ))}
          </div>
        )}
      </main>

      {/* Confirmation dialog. AlertDialog blochează interacțiunea cu restul
          paginii și e accesibil din tastatură. */}
      <AlertDialog open={pendingDelete !== null} onOpenChange={(open) => {
        if (!open) {
          setPendingDelete(null)
          setDeleteError(null)
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif italic">
              Delete this book?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes <em>{pendingDelete?.title}</em> along
              with its characters, relationships, and fragments. This cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && (
            <p className="text-sm italic text-destructive">{deleteError}</p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault() // nu închide dialogul până nu termină delete-ul
                void confirmDelete()
              }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    </RequireAuth>
  )
}
