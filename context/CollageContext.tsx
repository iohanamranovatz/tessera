"use client"

/**
 * CollageContext — shares the "currently hovered character" across every
 * fragment on the board, so we don't have to thread it through props.
 *
 * When a fragment is hovered we store its character id here; all other
 * fragments read this value to decide whether to stay bright or dim out.
 */

import { createContext, useContext, useState, type ReactNode } from "react"

interface CollageContextValue {
  /** Id of the character whose fragment is currently hovered, or null. */
  hoveredCharacterId: string | null
  setHoveredCharacterId: (id: string | null) => void
}

const CollageContext = createContext<CollageContextValue | null>(null)

export function CollageProvider({ children }: { children: ReactNode }) {
  const [hoveredCharacterId, setHoveredCharacterId] = useState<string | null>(null)

  return (
    <CollageContext.Provider value={{ hoveredCharacterId, setHoveredCharacterId }}>
      {children}
    </CollageContext.Provider>
  )
}

/** Access the collage hover state. Must be used inside a <CollageProvider>. */
export function useCollage(): CollageContextValue {
  const ctx = useContext(CollageContext)
  if (!ctx) {
    throw new Error("useCollage must be used within a CollageProvider")
  }
  return ctx
}
