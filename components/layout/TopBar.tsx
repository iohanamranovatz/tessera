"use client"

/**
 * TopBar — the application header.
 *
 * Left:  the "tessera" wordmark + a <BookSwitcher /> dropdown.
 * Right: the chapter indicator ("ch. 8/12"), a search icon and a settings icon.
 *
 * It loads the current book itself (via useBook) so it can show the live title
 * and chapter without the parent having to pass them down.
 */

import { Search, Settings } from "lucide-react"
import { useBook } from "@/hooks/use-tessera-data"
import { BookSwitcher } from "./BookSwitcher"
import type { Tab } from "./TabNavigation"

interface TopBarProps {
  bookId: string
  /** Active tab, forwarded to the switcher so it survives a book change. */
  activeTab: Tab
}

export function TopBar({ bookId, activeTab }: TopBarProps) {
  const { data: book } = useBook(bookId)

  return (
    <header
      className="flex items-center justify-between bg-accent px-4 py-3 sm:px-6"
      style={{ borderBottom: "0.5px solid var(--topbar-border)" }}
    >
      {/* Left section */}
      <div className="flex items-center gap-4 sm:gap-6">
        <h1 className="font-serif text-lg italic tracking-wide text-primary sm:text-xl">
          tessera
        </h1>
        <BookSwitcher
          currentBookId={bookId}
          currentTitle={book?.title ?? "…"}
          activeTab={activeTab}
        />
      </div>

      {/* Right section */}
      <div className="flex items-center gap-2 sm:gap-4">
        <button
          className="rounded p-2 transition-colors hover:bg-secondary/50"
          aria-label="Search"
        >
          <Search className="h-4 w-4 text-muted-foreground" />
        </button>
        <span className="hidden font-serif text-xs text-muted-foreground sm:inline">
          {book ? `ch. ${book.currentChapter}/${book.totalChapters}` : "ch. —/—"}
        </span>
        <button
          className="rounded p-2 transition-colors hover:bg-secondary/50"
          aria-label="Settings"
        >
          <Settings className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>
    </header>
  )
}
