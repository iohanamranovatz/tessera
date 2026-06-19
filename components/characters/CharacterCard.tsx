"use client"

/**
 * CharacterCard — a single character's card in the Characters grid.
 *
 * Purely presentational: it receives the character plus a few pre-computed
 * counts and renders the dark-academia card. All data loading and the detail
 * modal live in <CharactersView />.
 *
 * Visual rules (Stage 4 spec):
 *  - 3px left border in the character's accent colour
 *  - large serif-italic name, small ochre nicknames line
 *  - tag "pills" tinted with the character colour
 *  - footer "X relations · Y fragments"
 *  - on hover: brighter border + a subtle lift (translateY(-2px))
 *  - spoiler warning when the character appears after the current chapter
 */

import { AlertTriangle } from "lucide-react"
import type { Character } from "@/types"

interface CharacterCardProps {
  character: Character
  relationsCount: number
  fragmentsCount: number
  /** Reader's progress; drives the spoiler warning. */
  currentChapter: number
  onClick: () => void
}

export function CharacterCard({
  character,
  relationsCount,
  fragmentsCount,
  currentChapter,
  onClick,
}: CharacterCardProps) {
  const isSpoiler = character.appearsInChapter > currentChapter

  return (
    <button
      onClick={onClick}
      style={{ borderLeftColor: character.color }}
      className="group flex w-full flex-col gap-2 rounded border border-border border-l-[3px] bg-card/60 p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-muted-foreground/60 hover:bg-card"
    >
      {/* Name */}
      <h3 className="font-serif text-xl italic leading-tight text-foreground">
        {character.name}
      </h3>

      {/* Nicknames */}
      {character.nicknames.length > 0 && (
        <p className="text-sm italic text-muted-foreground">
          {character.nicknames.join(" · ")}
        </p>
      )}

      {/* Spoiler warning */}
      {isSpoiler && (
        <p className="flex items-center gap-1.5 text-xs italic text-destructive">
          <AlertTriangle className="h-3.5 w-3.5" />
          apare în cap. {character.appearsInChapter} · risc spoiler
        </p>
      )}

      {/* Tags */}
      {character.tags.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1.5">
          {character.tags.map((tag) => (
            <span
              key={tag}
              style={{
                // Tint the pill with the character's colour at low opacity
                // (hex + "22" ≈ 13% alpha) and use the full colour for text.
                backgroundColor: `${character.color}22`,
                color: character.color,
                borderColor: `${character.color}55`,
              }}
              className="rounded-full border px-2 py-0.5 text-xs font-serif"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Footer */}
      <p className="mt-2 border-t border-border/40 pt-2 text-xs font-serif text-muted-foreground/80">
        {relationsCount} relations · {fragmentsCount} fragments
      </p>
    </button>
  )
}
