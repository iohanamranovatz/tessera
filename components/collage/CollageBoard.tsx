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
 *
 * Board-ul e și locul unde se petrece CRUD-ul fragmentelor: selectare prin click,
 * mutare prin tragere, editare și ștergere din bara care apare pe cardul selectat.
 */

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { Plus } from "lucide-react"
import {
  useFragments,
  useCharacters,
  deleteFragment,
  updateFragmentPosition,
} from "@/hooks/use-tessera-data"
import { deleteFragmentImage } from "@/lib/supabase/upload"
import { takePendingImages } from "@/lib/pending-images"
import { isGeneratingImages, startImageGeneration } from "@/lib/image-generation"
import { CollageProvider, useCollage } from "@/context/CollageContext"
import { Fragment } from "./Fragment"
import { CharacterTooltip } from "./CharacterTooltip"
import { FragmentDialog } from "./FragmentDialog"
import type { Fragment as FragmentModel } from "@/types"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

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
  const [generating, setGenerating] = useState(false)

  // --- CRUD state ---
  const [dialogOpen, setDialogOpen] = useState(false)
  /** Fragmentul în curs de editare, sau null când adăugăm unul nou. */
  const [editing, setEditing] = useState<FragmentModel | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<FragmentModel | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  /**
   * Pozițiile mutate local, suprascrise peste cele din DB.
   *
   * Tragerea trebuie să fie fluidă, deci cardul se mișcă imediat, fără drum la
   * server. Ținem DOAR pozițiile aici — adăugarea/editarea/ștergerea merg prin
   * `refetch()`, deci nu dublăm toată lista de fragmente în state.
   */
  const [moved, setMoved] = useState<Record<string, { x: number; y: number }>>({})

  // Dimensiunile board-ului, necesare ca să traducem pixelii de tragere în
  // procente (modelul stochează 0–100, ca layout-ul să fie independent de ecran).
  const boardRef = useRef<HTMLElement>(null)
  const [boardSize, setBoardSize] = useState({ width: 0, height: 0 })

  useLayoutEffect(() => {
    const element = boardRef.current
    if (!element) return
    const update = () => {
      const rect = element.getBoundingClientRect()
      setBoardSize({ width: rect.width, height: rect.height })
    }
    update()
    // La redimensionarea ferestrei procentele rămân valide, dar conversia
    // px → % se schimbă, deci remăsurăm.
    const observer = new ResizeObserver(update)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

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

  // Escape deselectează — ieșirea evidentă dintr-o selecție.
  useEffect(() => {
    if (!selectedId) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedId(null)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [selectedId])

  // Index characters by id so each fragment + the tooltip can look theirs up.
  const charactersById = useMemo(
    () => new Map(characters.map((c) => [c.id, c])),
    [characters],
  )
  const hoveredCharacter = hoveredCharacterId
    ? charactersById.get(hoveredCharacterId)
    : undefined

  // Fragmentele, cu pozițiile mutate local aplicate peste cele din DB.
  const displayed = useMemo(
    () =>
      fragments.map((f) => {
        const override = moved[f.id]
        return override ? { ...f, position: { ...f.position, ...override } } : f
      }),
    [fragments, moved],
  )

  const handleDragMove = useCallback((id: string, x: number, y: number) => {
    setMoved((prev) => ({ ...prev, [id]: { x, y } }))
  }, [])

  const handleDragEnd = useCallback(
    (fragment: FragmentModel) => {
      // `fragment` vine deja din lista afișată, deci poartă poziția mutată.
      void updateFragmentPosition(fragment.id, fragment.position).catch((err) => {
        console.error("Couldn't save the new position:", err)
        // Salvarea a picat: scoatem suprascrierea, ca să revină vizibil unde
        // chiar e în DB. Mai bine un card care sare înapoi decât unul care pare
        // mutat și nu e.
        setMoved((prev) => {
          const next = { ...prev }
          delete next[fragment.id]
          return next
        })
      })
    },
    [],
  )

  function openAdd() {
    setEditing(null)
    setDialogOpen(true)
  }

  function openEdit(fragment: FragmentModel) {
    setEditing(fragment)
    setDialogOpen(true)
  }

  async function confirmDelete() {
    if (!pendingDelete || deleting) return
    setDeleting(true)
    setDeleteError(null)
    try {
      await deleteFragment(pendingDelete.id)
      // Fișierele din Storage se curăță DUPĂ ce rândul chiar a dispărut. Dacă
      // am șterge întâi pozele și ștergerea rândului ar pica, am rămâne cu un
      // card care arată spre imagini inexistente.
      void deleteFragmentImage(pendingDelete.imageMeta)
      setPendingDelete(null)
      setSelectedId(null)
      await refetch()
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Couldn't delete that fragment.")
    } finally {
      setDeleting(false)
    }
  }

  const loading = fragmentsLoading || charactersLoading

  return (
    <main
      ref={boardRef}
      className="relative flex-1 overflow-hidden bg-card"
      onMouseMove={(e) => setCursor({ x: e.clientX, y: e.clientY })}
      // Click pe fundal (nu pe un card) deselectează.
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) setSelectedId(null)
      }}
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

      {/* Fragments laid out absolutely. Stratul primește click-urile care nu
          nimeresc niciun card, ca să funcționeze deselectarea pe toată suprafața. */}
      <div
        className="absolute inset-0"
        onPointerDown={(e) => {
          if (e.target === e.currentTarget) setSelectedId(null)
        }}
      >
        {displayed.map((fragment, index) => (
          <Fragment
            key={fragment.id}
            fragment={fragment}
            character={charactersById.get(fragment.characterId)}
            zIndex={index + 1}
            boardSize={boardSize}
            selected={selectedId === fragment.id}
            onSelect={() => setSelectedId(fragment.id)}
            onDragMove={(x, y) => handleDragMove(fragment.id, x, y)}
            onDragEnd={() => handleDragEnd(fragment)}
            onEdit={() => openEdit(fragment)}
            onDelete={() => {
              setDeleteError(null)
              setPendingDelete(fragment)
            }}
          />
        ))}
      </div>

      {/* Bottom caption */}
      {!loading && (
        <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2">
          <p className="text-center font-serif text-xs text-muted-foreground/70">
            {fragments.length} fragments · drag to move · click to edit
          </p>
        </div>
      )}

      {/* Cursor-following tooltip for the hovered character */}
      {hoveredCharacter && <CharacterTooltip character={hoveredCharacter} position={cursor} />}

      {/* Floating "add fragment" button */}
      <button
        onClick={openAdd}
        aria-label="Add fragment"
        data-testid="board-add"
        className="absolute bottom-6 right-6 z-[250] flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-colors hover:bg-primary/90"
      >
        <Plus className="h-5 w-5" />
      </button>

      {/* Add / edit modal */}
      <FragmentDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        bookId={bookId}
        characters={characters}
        existingFragments={fragments}
        editing={editing}
        onSaved={() => {
          setSelectedId(null)
          void refetch()
        }}
      />

      {/* Confirmarea ștergerii — același tipar ca ștergerea cărților din /library. */}
      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open && !deleting) {
            setPendingDelete(null)
            setDeleteError(null)
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif italic">
              Delete this fragment?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete?.label
                ? `“${pendingDelete.label}” will be removed from the board.`
                : "This fragment will be removed from the board."}{" "}
              {pendingDelete?.imageMeta?.storagePath
                ? "The image you uploaded will be deleted too."
                : ""}{" "}
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && <p className="text-sm italic text-destructive">{deleteError}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault() // nu închide dialogul până nu termină ștergerea
                void confirmDelete()
              }}
              disabled={deleting}
              data-testid="confirm-delete-fragment"
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  )
}
