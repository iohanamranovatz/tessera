"use client"

import { Grid3X3, Users, GitBranch } from "lucide-react"
import { cn } from "@/lib/utils"

type Tab = "collage" | "characters" | "relations"

interface TabNavigationProps {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
}

const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "collage", label: "collage", icon: <Grid3X3 className="w-3.5 h-3.5" /> },
  { id: "characters", label: "characters", icon: <Users className="w-3.5 h-3.5" /> },
  { id: "relations", label: "relations", icon: <GitBranch className="w-3.5 h-3.5" /> },
]

export function TabNavigation({ activeTab, onTabChange }: TabNavigationProps) {
  return (
    <nav className="flex items-center gap-1 px-4 sm:px-6 py-2 bg-accent">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={cn(
            "flex items-center gap-2 px-3 py-2 text-sm font-serif transition-all relative",
            activeTab === tab.id
              ? "text-foreground"
              : "text-muted-foreground hover:text-foreground/80"
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
