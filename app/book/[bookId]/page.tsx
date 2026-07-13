"use client"

/**
 * /book/[bookId] — the main app screen for one book.
 *
 * Routing model:
 *  - the BOOK lives in the dynamic route segment: /book/<bookId>
 *  - the active TAB lives in the query string: ?tab=collage|characters|relations
 *
 * The active tab is held in a plain useState (seeded from ?tab=) and mirrored
 * back into the URL on every change, so a tab is shareable/bookmarkable while
 * switching books is a real navigation handled by <BookSwitcher>.
 *
 * useSearchParams must sit inside a <Suspense> boundary in the App Router, so
 * the actual screen is a child component wrapped below.
 */

import { Suspense, useState } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { TopBar } from "@/components/layout/TopBar"
import { TabNavigation, type Tab } from "@/components/layout/TabNavigation"
import { CollageBoard } from "@/components/collage/CollageBoard"
import { CharactersView } from "@/components/characters/CharactersView"
import { RelationsView } from "@/components/relations/RelationsView"
import { RequireAuth } from "@/components/auth/RequireAuth"

const VALID_TABS: Tab[] = ["collage", "characters", "relations"]

function BookScreen() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()

  // `bookId` can be string | string[]; for a single [bookId] segment it's a string.
  const bookId = String(params.bookId)

  // Seed the tab from ?tab=, falling back to "collage" if missing/invalid.
  const tabParam = searchParams.get("tab") as Tab | null
  const initialTab: Tab = tabParam && VALID_TABS.includes(tabParam) ? tabParam : "collage"
  const [activeTab, setActiveTab] = useState<Tab>(initialTab)

  function changeTab(tab: Tab) {
    setActiveTab(tab)
    // Mirror into the URL without adding history entries.
    router.replace(`/book/${bookId}?tab=${tab}`)
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden paper-texture">
      <TopBar bookId={bookId} activeTab={activeTab} />
      <TabNavigation activeTab={activeTab} onTabChange={changeTab} />

      {activeTab === "collage" && <CollageBoard bookId={bookId} />}
      {activeTab === "characters" && <CharactersView bookId={bookId} />}
      {activeTab === "relations" && <RelationsView bookId={bookId} />}
    </div>
  )
}

export default function BookPage() {
  return (
    <RequireAuth>
      <Suspense fallback={null}>
        <BookScreen />
      </Suspense>
    </RequireAuth>
  )
}
