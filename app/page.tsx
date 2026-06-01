"use client"

import { useState } from "react"
import { TopBar } from "@/components/tessera/top-bar"
import { TabNavigation } from "@/components/tessera/tab-navigation"
import { CollageBoard } from "@/components/collage/CollageBoard"
import { RelationsGraph } from "@/components/tessera/relations-graph"
import { BOOK_ID } from "@/data/karamazov"

type Tab = "collage" | "characters" | "relations"

export default function TesseraPage() {
  const [activeTab, setActiveTab] = useState<Tab>("collage")

  return (
    <div className="min-h-screen flex flex-col paper-texture">
      <TopBar />
      <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />
      
      {activeTab === "collage" && <CollageBoard bookId={BOOK_ID} />}
      
      {activeTab === "characters" && (
        <main className="flex-1 flex items-center justify-center bg-card">
          <p className="text-muted-foreground font-serif italic">
            Characters view coming soon...
          </p>
        </main>
      )}
      
      {activeTab === "relations" && <RelationsGraph />}
    </div>
  )
}
