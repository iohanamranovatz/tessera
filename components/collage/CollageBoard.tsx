"use client"

/**
 * CollageBoard — the dark canvas that holds all of a book's fragments.
 *
 * - reads fragments + characters for the given book via hooks
 * - draws a subtle paper/dot texture using an inline SVG <pattern>
 * - lays out each <Fragment /> absolutely using its stored position
 * - shows a <CharacterTooltip /> that follows the cursor while hovering
 *
 * Hover state is shared through <CollageProvider> so individual fragments can
 * dim/brighten without prop drilling.
 */

import { useState } from "react"
import { useFragments, useCharacter } from "@/hooks/use-tessera-data"
import { CollageProvider, useCollage } from "@/context/CollageContext"
import { Fragment } from "./Fragment"
import { CharacterTooltip } from "./CharacterTooltip"

interface CollageBoardProps {
  bookId: string
}

export function CollageBoard({ bookId }: CollageBoardProps) {
  // The provider must wrap the inner board so the tooltip can read hover state.
  return (
    <CollageProvider>
      <CollageBoardInner bookId={bookId} />
    </CollageProvider>
  )
}

function CollageBoardInner({ bookId }: CollageBoardProps) {
  const fragments = useFragments(bookId)
  const { hoveredCharacterId } = useCollage()
  const hoveredCharacter = useCharacter(hoveredCharacterId ?? undefined)

  const [cursor, setCursor] = useState({ x: 0, y: 0 })

  return (
    <main
      className="relative flex-1 overflow-hidden bg-card"
      onMouseMove={(e) => setCursor({ x: e.clientX, y: e.clientY })}
    >
      {/* Subtle paper texture via an inline SVG dot pattern */}
      <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
        <defs>
          <pattern id="collage-dots" width="16" height="16" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="1" fill="rgba(138, 118, 86, 0.15)" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#collage-dots)" />
      </svg>

      {/* Background watermark (Cyrillic "brothers") */}
      <div className="pointer-events-none absolute inset-0 flex select-none items-center justify-center">
        <span className="font-serif text-[12vw] italic tracking-widest text-foreground/[0.04]">
          братья
        </span>
      </div>

      {/* Fragments laid out absolutely */}
      <div className="absolute inset-0">
        {fragments.map((fragment, index) => (
          <Fragment key={fragment.id} fragment={fragment} zIndex={index + 1} />
        ))}
      </div>

      {/* Bottom caption */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
        <p className="text-center font-serif text-xs text-muted-foreground/70">
          {fragments.length} fragments · hover for character details
        </p>
      </div>

      {/* Cursor-following tooltip for the hovered character */}
      {hoveredCharacter && <CharacterTooltip character={hoveredCharacter} position={cursor} />}
    </main>
  )
}
