"use client"

/**
 * CharactersView — the "Characters" tab.
 *
 * Loads everything the cards need (book for the current chapter, characters,
 * relationships and fragments for the counts), lays them out in a responsive
 * grid, and wires up the detail/edit modal plus the "new character" flow.
 *
 * Relation/fragment counts are computed once with useMemo so each card just
 * looks its numbers up by id.
 */

import { useMemo, useState } from "react"
import { Plus } from "lucide-react"
import {
  useBook,
  useCharacters,
  useRelationships,
  useFragments,
} from "@/hooks/use-tessera-data"
import type { Character } from "@/types"
import { CharacterCard } from "./CharacterCard"
import { CharacterDetailDialog } from "./CharacterDetailDialog"

interface CharactersViewProps {
  bookId: string
}

export function CharactersView({ bookId }: CharactersViewProps) {
  const { data: book } = useBook(bookId)
  const { data: characters, loading, refetch } = useCharacters(bookId)
  const { data: relationships } = useRelationships(bookId)
  const { data: fragments } = useFragments(bookId)

  // Which character is open in the modal, and whether we're creating a new one.
  const [selected, setSelected] = useState<Character | null>(null)
  const [creating, setCreating] = useState(false)

  const currentChapter = book?.currentChapter ?? Infinity

  // Count relations per character (a relation touches both of its endpoints).
  const relationCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const rel of relationships) {
      counts.set(rel.fromCharacterId, (counts.get(rel.fromCharacterId) ?? 0) + 1)
      counts.set(rel.toCharacterId, (counts.get(rel.toCharacterId) ?? 0) + 1)
    }
    return counts
  }, [relationships])

  // Count fragments per character.
  const fragmentCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const frag of fragments) {
      counts.set(frag.characterId, (counts.get(frag.characterId) ?? 0) + 1)
    }
    return counts
  }, [fragments])

  // A blank character used to seed the "new character" form.
  const blankCharacter: Character = {
    id: "",
    bookId,
    name: "",
    nicknames: [],
    description: "",
    tags: [],
    color: "#8a3020",
    status: "alive",
    appearsInChapter: 1,
    avatarType: "initial",
  }

  function closeDialog() {
    setSelected(null)
    setCreating(false)
  }

  return (
    <main className="flex-1 overflow-auto bg-card">
      <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6">
        {/* Header + add button */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-serif text-2xl italic text-foreground">Characters</h2>
          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-1.5 rounded border border-primary/50 px-3 py-1.5 font-serif text-sm italic text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
          >
            <Plus className="h-4 w-4" />
            new character
          </button>
        </div>

        {/* Loading state */}
        {loading && (
          <p className="animate-pulse py-12 text-center font-serif italic text-muted-foreground">
            loading characters…
          </p>
        )}

        {/* Empty state */}
        {!loading && characters.length === 0 && (
          <p className="py-12 text-center font-serif italic text-muted-foreground">
            no characters yet — add the first one.
          </p>
        )}

        {/* Responsive grid: 1 column on mobile, 2 on desktop */}
        {!loading && characters.length > 0 && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {characters.map((character) => (
              <CharacterCard
                key={character.id}
                character={character}
                relationsCount={relationCounts.get(character.id) ?? 0}
                fragmentsCount={fragmentCounts.get(character.id) ?? 0}
                currentChapter={currentChapter}
                onClick={() => setSelected(character)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Detail / edit modal for an existing character */}
      <CharacterDetailDialog
        open={selected !== null}
        onClose={closeDialog}
        character={selected}
        relationsCount={selected ? relationCounts.get(selected.id) ?? 0 : 0}
        fragmentsCount={selected ? fragmentCounts.get(selected.id) ?? 0 : 0}
        onSaved={refetch}
      />

      {/* New-character modal */}
      <CharacterDetailDialog
        open={creating}
        onClose={closeDialog}
        character={creating ? blankCharacter : null}
        isNew
        onSaved={refetch}
      />
    </main>
  )
}
