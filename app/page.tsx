"use client"

import { useState } from "react"
import { TopBar } from "@/components/tessera/top-bar"
import { TabNavigation } from "@/components/tessera/tab-navigation"
import { CollageBoard } from "@/components/collage/CollageBoard"
import { CharactersView } from "@/components/characters/CharactersView"
import { RelationsView } from "@/components/relations/RelationsView"
import { BOOK_ID } from "@/data/karamazov"

type Tab = "collage" | "characters" | "relations"

export default function TesseraPage() {
  const [activeTab, setActiveTab] = useState<Tab>("collage")

  return (
    <div className="h-screen flex flex-col overflow-hidden paper-texture">
      <TopBar />
      <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />
      
      {activeTab === "collage" && <CollageBoard bookId={BOOK_ID} />}
      
      {activeTab === "characters" && <CharactersView bookId={BOOK_ID} />}
      
      {activeTab === "relations" && <RelationsView bookId={BOOK_ID} />}
    </div>
  )
}
