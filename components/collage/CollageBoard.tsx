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

import { useEffect, useMemo, useState } from "react"
import { Plus } from "lucide-react"
import { useFragments, useCharacters } from "@/hooks/use-tessera-data"
import { takePendingImages } from "@/lib/pending-images"
import { isGeneratingImages, startImageGeneration } from "@/lib/image-generation"
import { CollageProvider, useCollage } from "@/context/CollageContext"
import { Fragment } from "./Fragment"
import { CharacterTooltip } from "./CharacterTooltip"
import { AddFragmentDialog } from "./AddFragmentDialog"

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
  const { data: fragments, loading: fragmentsLoading, refetch } = useFragments(bookId)
  const { data: characters, loading: charactersLoading } = useCharacters(bookId)
  const { hoveredCharacterId } = useCollage()

  const [cursor, setCursor] = useState({ x: 0, y: 0 })
  const [addOpen, setAddOpen] = useState(false)
  const [generating, setGenerating] = useState(false)

  // După onboarding, board-ul ridică „biletul" cu personajele ce așteaptă imagini
  // și pornește căutarea în fundal. Cât timp durează, reîmprospătăm fragmentele
  // periodic, ca imaginile să apară în valuri. (Vezi lib/image-generation.ts.)
  useEffect(() => {
    const work = takePendingImages(bookId)
    if (work) startImageGeneration(bookId, work)

    // Dacă nimic nu se generează (nici acum pornit, nici deja în curs), ieșim.
    if (!work && !isGeneratingImages(bookId)) return

    setGenerating(true)
    const interval = setInterval(() => {
      void refetch()
      if (!isGeneratingImages(bookId)) {
        clearInterval(interval)
        setGenerating(false)
      }
    }, 3000)
    return () => clearInterval(interval)
  }, [bookId, refetch])

  // Index characters by id so each fragment + the tooltip can look theirs up.
  const charactersById = useMemo(
    () => new Map(characters.map((c) => [c.id, c])),
    [characters],
  )
  const hoveredCharacter = hoveredCharacterId
    ? charactersById.get(hoveredCharacterId)
    : undefined

  const loading = fragmentsLoading || charactersLoading

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

      {/* While the database is loading */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="animate-pulse font-serif italic text-muted-foreground">
            loading fragments…
          </p>
        </div>
      )}

      {/* While images are being gathered in the background after onboarding */}
      {generating && (
        <div className="absolute left-1/2 top-4 z-50 -translate-x-1/2">
          <p className="animate-pulse rounded-full border border-border bg-card/80 px-4 py-1.5 font-serif text-xs italic text-muted-foreground shadow-sm backdrop-blur">
            gathering images…
          </p>
        </div>
      )}

      {/* Fragments laid out absolutely */}
      <div className="absolute inset-0">
        {fragments.map((fragment, index) => (
          <Fragment
            key={fragment.id}
            fragment={fragment}
            character={charactersById.get(fragment.characterId)}
            zIndex={index + 1}
          />
        ))}
      </div>

      {/* Bottom caption */}
      {!loading && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
          <p className="text-center font-serif text-xs text-muted-foreground/70">
            {fragments.length} fragments · hover for character details
          </p>
        </div>
      )}

      {/* Cursor-following tooltip for the hovered character */}
      {hoveredCharacter && <CharacterTooltip character={hoveredCharacter} position={cursor} />}

      {/* Floating "add fragment" button */}
      <button
        onClick={() => setAddOpen(true)}
        aria-label="Add fragment"
        className="absolute bottom-6 right-6 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-colors hover:bg-primary/90"
      >
        <Plus className="h-5 w-5" />
      </button>

      {/* Add-fragment modal */}
      <AddFragmentDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        bookId={bookId}
        characters={characters}
        existingFragments={fragments}
        onAdded={refetch}
      />
    </main>
  )
}
