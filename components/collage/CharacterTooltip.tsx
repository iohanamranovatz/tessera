"use client"

/**
 * CharacterTooltip — a small floating card that follows the cursor and shows
 * who the hovered fragment belongs to: name, nicknames, tags and a short
 * spoiler-safe description.
 */

import type { Character } from "@/types"

interface CharacterTooltipProps {
  character: Character
  /** Cursor position in viewport pixels. */
  position: { x: number; y: number }
}

export function CharacterTooltip({ character, position }: CharacterTooltipProps) {
  return (
    <div
      className="pointer-events-none fixed z-[200] w-64 rounded border border-border/70 bg-[#0a0604] p-4 shadow-xl"
      style={{
        left: position.x + 16,
        top: position.y + 16,
        // fade-in on appear
        animation: "tessera-tooltip-in 150ms ease-out",
      }}
    >
      <p className="font-serif text-base italic text-foreground">{character.name}</p>

      {character.nicknames.length > 0 && (
        <p className="mt-0.5 text-xs italic text-muted-foreground">
          {character.nicknames.join(" · ")}
        </p>
      )}

      {character.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {character.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-border/60 px-2 py-0.5 text-[10px] text-muted-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      <p className="mt-2 text-xs leading-relaxed text-foreground/80">{character.description}</p>

      {/* keyframes are scoped here so the component is self-contained */}
      <style>{`
        @keyframes tessera-tooltip-in {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
