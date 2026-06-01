"use client"

import { Search, Settings, ChevronDown } from "lucide-react"

export function TopBar() {
  return (
    <header 
      className="flex items-center justify-between px-4 sm:px-6 py-3 bg-accent"
      style={{ borderBottom: "0.5px solid var(--topbar-border)" }}
    >
      {/* Left section */}
      <div className="flex items-center gap-4 sm:gap-6">
        <h1 className="text-lg sm:text-xl text-primary italic font-serif tracking-wide">
          tessera
        </h1>
        <button className="flex items-center gap-2 px-3 py-1.5 rounded border border-border hover:bg-secondary/50 transition-colors">
          <span className="text-xs sm:text-sm text-foreground/90 font-serif">
            The Brothers Karamazov
          </span>
          <ChevronDown className="w-3 h-3 text-muted-foreground" />
        </button>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-2 sm:gap-4">
        <button className="p-2 hover:bg-secondary/50 rounded transition-colors" aria-label="Search">
          <Search className="w-4 h-4 text-muted-foreground" />
        </button>
        <span className="text-xs text-muted-foreground font-serif hidden sm:inline">
          ch. 8/12
        </span>
        <button className="p-2 hover:bg-secondary/50 rounded transition-colors" aria-label="Settings">
          <Settings className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>
    </header>
  )
}
