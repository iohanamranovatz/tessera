"use client"

/**
 * Fragment — a single scrap pinned to the collage board.
 *
 * Visual layers (back to front):
 *   1. a blurred "film" of the character's colour (the coloured halo)
 *   2. the cream card with a soft shadow
 *   3. the type-specific content (see FragmentContent)
 *   4. an optional attribution line (Unsplash) shown only on hover
 *
 * Hover behaviour (shared via CollageContext):
 *   - hovering this fragment sets the hovered character id
 *   - fragments of the hovered character stay bright with an intense halo
 *   - all other fragments dim out (reduced brightness + saturation)
 *
 * INTERACȚIUNE (adăugată la CRUD-ul de fragmente):
 *   - TRAGERE pentru mutare, cu pointer events — aceleași handler-e acoperă și
 *     mouse-ul, și touch-ul, deci merge și pe telefon.
 *   - CLICK (fără tragere) selectează cardul și arată butoanele de editare/ștergere.
 *   Cele două se disting printr-un prag de câțiva pixeli: fără el, orice click
 *   ar deveni o micro-mutare și board-ul ar „aluneca" sub degete.
 *
 * Unsplash tracking (STAGIUL 7.5.B):
 *   - hover > 2s or click triggers a one-shot ping to Unsplash's download
 *     endpoint, via `/api/unsplash/track`. Handlers are composed with the
 *     existing collage-hover handlers below.
 */

import { useRef, useState } from "react"
import { Pencil, Trash2 } from "lucide-react"
import { useCollage } from "@/context/CollageContext"
import type { Character, Fragment as FragmentModel } from "@/types"
import { FragmentContent } from "./FragmentContent"
import { ImageAttribution } from "@/components/images/ImageAttribution"
import { useUnsplashTracking } from "@/hooks/useUnsplashTracking"
import { cn } from "@/lib/utils"

interface FragmentProps {
  fragment: FragmentModel
  /** The owning character (passed down from the board to avoid per-card fetches). */
  character?: Character
  /** Stacking order so cards overlap predictably. */
  zIndex?: number
  /** Dimensiunile board-ului în px — ca să traducem deplasarea în procente. */
  boardSize: { width: number; height: number }
  /** True dacă acest card e cel selectat (arată bara de acțiuni). */
  selected: boolean
  /** Click scurt pe card (sub pragul de tragere). */
  onSelect: () => void
  /** Chemat continuu cât se trage, cu poziția nouă în procente. */
  onDragMove: (x: number, y: number) => void
  /** Chemat la eliberare, ca board-ul să persiste poziția. */
  onDragEnd: () => void
  onEdit: () => void
  onDelete: () => void
}

const sizeClasses: Record<FragmentModel["size"], string> = {
  small: "w-24 h-28 sm:w-28 sm:h-32",
  medium: "w-28 h-32 sm:w-32 sm:h-36 md:w-36 md:h-40",
  large: "w-32 h-36 sm:w-40 sm:h-44 md:w-44 md:h-48",
}

/** Cât trebuie să miște degetul/mouse-ul ca să fie tragere, nu click. */
const DRAG_THRESHOLD_PX = 4

/** Marginea în procente dincolo de care un card nu poate fi aruncat. */
const EDGE_MARGIN = 2

/** Sub poziția asta (procent din înălțimea board-ului) bara de acțiuni se mută
 *  DEDESUBTUL cardului. Deasupra n-ar încăpea: board-ul taie ce iese din el. */
const TOOLBAR_FLIP_BELOW_Y = 12

function clamp(value: number): number {
  return Math.min(100 - EDGE_MARGIN, Math.max(EDGE_MARGIN, value))
}

export function Fragment({
  fragment,
  character,
  zIndex = 1,
  boardSize,
  selected,
  onSelect,
  onDragMove,
  onDragEnd,
  onEdit,
  onDelete,
}: FragmentProps) {
  const { hoveredCharacterId, setHoveredCharacterId } = useCollage()

  // Unsplash tracking — no-op pentru orice imagine fără downloadLocation.
  const unsplash = useUnsplashTracking(fragment.imageMeta?.downloadLocation)

  const [dragging, setDragging] = useState(false)
  // Starea tragerii stă într-un ref, nu în state: se schimbă la fiecare mișcare
  // de pointer și n-are ce căuta într-un re-render.
  const drag = useRef<{
    startX: number
    startY: number
    originX: number
    originY: number
    moved: boolean
  } | null>(null)

  const color = character?.color ?? "#8a7656"
  const { x, y, rotation } = fragment.position

  // Decide how this fragment reacts to the global hover state.
  const isSomethingHovered = hoveredCharacterId !== null
  const isActive = hoveredCharacterId === fragment.characterId
  // Cât tragem, nu estompăm nimic: cardul tras trebuie să rămână clar vizibil.
  const isDimmed = isSomethingHovered && !isActive && !dragging

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    // Doar butonul principal / atingerea. Click-dreapta rămâne pentru browser.
    if (event.button !== 0) return
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = {
      startX: event.clientX,
      startY: event.clientY,
      originX: x,
      originY: y,
      moved: false,
    }
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const state = drag.current
    if (!state || boardSize.width === 0 || boardSize.height === 0) return

    const dx = event.clientX - state.startX
    const dy = event.clientY - state.startY

    // Sub prag încă nu decidem: poate fi doar tremurul mâinii la un click.
    if (!state.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return
    if (!state.moved) {
      state.moved = true
      setDragging(true)
    }

    onDragMove(
      clamp(state.originX + (dx / boardSize.width) * 100),
      clamp(state.originY + (dy / boardSize.height) * 100),
    )
  }

  function handlePointerUp(event: React.PointerEvent<HTMLDivElement>) {
    const state = drag.current
    drag.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    if (!state) return

    if (state.moved) {
      setDragging(false)
      onDragEnd()
    } else {
      // N-a fost tragere, deci a fost un click: selectăm cardul.
      onSelect()
      unsplash.onClick()
    }
  }

  return (
    <div
      // `group` activează `group-hover:` din ImageAttribution (apare creditul).
      className={cn(
        // `select-none`: fără el, tragerea peste un card cu text (un citat)
        // selectează textul în loc să mute cardul — arată ca un bug.
        "group absolute select-none",
        dragging ? "cursor-grabbing" : "cursor-grab",
        // Tranziția ar face cardul să „alerge după" cursor cu întârziere.
        !dragging && "transition-all duration-300 ease-out",
      )}
      style={{
        left: `${x}%`,
        top: `${y}%`,
        transform: `rotate(${rotation}deg) scale(${isActive && !dragging ? 1.08 : 1})`,
        zIndex: dragging ? 200 : selected ? 150 : isActive ? 100 : zIndex,
        filter: isDimmed ? "brightness(0.5) saturate(0.4)" : "none",
        opacity: isDimmed ? 0.6 : 1,
        // Fără asta, pe telefon o tragere ar derula pagina în loc să mute cardul.
        touchAction: "none",
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onMouseEnter={() => {
        setHoveredCharacterId(fragment.characterId)
        unsplash.onMouseEnter() // pornește timer-ul de 2s (no-op dacă nu e Unsplash)
      }}
      onMouseLeave={() => {
        setHoveredCharacterId(null)
        unsplash.onMouseLeave() // anulează timer-ul
      }}
      data-testid="fragment"
      data-fragment-id={fragment.id}
    >
      {/* Layer 1: blurred coloured film / halo behind the card */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 rounded-md transition-all duration-300"
        style={{
          backgroundColor: color,
          opacity: isActive ? 0.55 : 0.3,
          filter: `blur(${isActive ? 26 : 16}px)`,
          transform: "scale(1.1)",
        }}
      />

      {/* Layer 2 + 3: cream card with soft shadow + the content */}
      <div
        className={cn(
          "relative flex flex-col bg-[#f5f0e6] p-2 pb-5",
          dragging
            ? "shadow-[0_18px_36px_rgba(0,0,0,0.6)]"
            : "shadow-[0_4px_12px_rgba(0,0,0,0.4)]",
          selected && "ring-2 ring-primary ring-offset-2 ring-offset-card",
          sizeClasses[fragment.size],
        )}
      >
        <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-secondary">
          <FragmentContent fragment={fragment} color={color} />
          {/* Layer 4: atribuire (Unsplash) — vizibilă doar la hover, peste imagine. */}
          <ImageAttribution meta={fragment.imageMeta} />
        </div>
      </div>

      {/* Bara de acțiuni — doar pentru cardul selectat, și niciodată cât se trage.
          Stă deasupra cardului, DAR se mută dedesubt când cardul e lipit de
          marginea de sus: board-ul are `overflow-hidden`, deci acolo bara ar fi
          tăiată și butoanele n-ar mai putea fi apăsate deloc. */}
      {selected && !dragging && (
        <div
          className={cn(
            "absolute left-1/2 flex -translate-x-1/2 gap-1 rounded border border-border bg-card/95 p-1 shadow-lg backdrop-blur",
            y < TOOLBAR_FLIP_BELOW_Y ? "top-full mt-2" : "-top-10",
          )}
          // Butoanele nu trebuie să pornească o tragere a cardului de dedesubt.
          onPointerDown={(e) => e.stopPropagation()}
        >
          <button
            onClick={onEdit}
            title="Edit fragment"
            aria-label="Edit fragment"
            data-testid="fragment-edit"
            className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onDelete}
            title="Delete fragment"
            aria-label="Delete fragment"
            data-testid="fragment-delete"
            className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-destructive/20 hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  )
}
