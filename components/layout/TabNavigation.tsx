"use client"

/**
 * TabNavigation — the three-view switcher (Collage / Characters / Relations).
 *
 * Purely presentational: the parent owns the active-tab state (a useState) and
 * passes it down, so this component just renders buttons and calls back on
 * click. The active tab gets a cream underline.
 */

import { Grid3X3, Users, GitBranch } from "lucide-react"
import { cn } from "@/lib/utils"

/** The three top-level views. Exported so the page can type its useState. */
export type Tab = "collage" | "characters" | "relations"

interface TabNavigationProps {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
}

const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "collage", label: "collage", icon: <Grid3X3 className="h-3.5 w-3.5" /> },
  { id: "characters", label: "characters", icon: <Users className="h-3.5 w-3.5" /> },
  { id: "relations", label: "relationships", icon: <GitBranch className="h-3.5 w-3.5" /> },
]

export function TabNavigation({ activeTab, onTabChange }: TabNavigationProps) {
  return (
    <nav className="flex items-center gap-1 bg-accent px-4 py-2 sm:px-6">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={cn(
            "relative flex items-center gap-2 px-3 py-2 font-serif text-sm transition-all",
            activeTab === tab.id
              ? "text-foreground"
              : "text-muted-foreground hover:text-foreground/80",
          )}
        >
          {tab.icon}
          <span>{tab.label}</span>
          {activeTab === tab.id && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
          )}
        </button>
      ))}
    </nav>
  )
}
