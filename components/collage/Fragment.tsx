"use client"

/**
 * Fragment — a single scrap pinned to the collage board.
 *
 * Visual layers (back to front):
 *   1. a blurred "film" of the character's colour (the coloured halo)
 *   2. the cream card with a soft shadow
 *   3. the type-specific content (see FragmentContent)
 *
 * Hover behaviour (shared via CollageContext):
 *   - hovering this fragment sets the hovered character id
 *   - fragments of the hovered character stay bright with an intense halo
 *   - all other fragments dim out (reduced brightness + saturation)
 */

import { useCharacter } from "@/hooks/use-tessera-data"
import { useCollage } from "@/context/CollageContext"
import type { Fragment as FragmentModel } from "@/types"
import { FragmentContent } from "./FragmentContent"
import { cn } from "@/lib/utils"

interface FragmentProps {
  fragment: FragmentModel
  /** Stacking order so cards overlap predictably. */
  zIndex?: number
}

const sizeClasses: Record<FragmentModel["size"], string> = {
  small: "w-24 h-28 sm:w-28 sm:h-32",
  medium: "w-28 h-32 sm:w-32 sm:h-36 md:w-36 md:h-40",
  large: "w-32 h-36 sm:w-40 sm:h-44 md:w-44 md:h-48",
}

export function Fragment({ fragment, zIndex = 1 }: FragmentProps) {
  const character = useCharacter(fragment.characterId)
  const { hoveredCharacterId, setHoveredCharacterId } = useCollage()

  const color = character?.color ?? "#8a7656"
  const { x, y, rotation } = fragment.position

  // Decide how this fragment reacts to the global hover state.
  const isSomethingHovered = hoveredCharacterId !== null
  const isActive = hoveredCharacterId === fragment.characterId
  const isDimmed = isSomethingHovered && !isActive

  return (
    <div
      className="absolute cursor-pointer transition-all duration-300 ease-out"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        transform: `rotate(${rotation}deg) scale(${isActive ? 1.08 : 1})`,
        zIndex: isActive ? 100 : zIndex,
        filter: isDimmed ? "brightness(0.5) saturate(0.4)" : "none",
        opacity: isDimmed ? 0.6 : 1,
      }}
      onMouseEnter={() => setHoveredCharacterId(fragment.characterId)}
      onMouseLeave={() => setHoveredCharacterId(null)}
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
          "relative flex flex-col bg-[#f5f0e6] p-2 pb-5 shadow-[0_4px_12px_rgba(0,0,0,0.4)]",
          sizeClasses[fragment.size],
        )}
      >
        <div className="flex h-full w-full items-center justify-center overflow-hidden bg-secondary">
          <FragmentContent fragment={fragment} color={color} />
        </div>
      </div>
    </div>
  )
}
