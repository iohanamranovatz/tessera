"use client"

/**
 * Ecranul 4 — sumar + salvare.
 *
 * Arată un rezumat al cărții și al personajelor adunate în flow, apoi, la
 * „deschide universul", scrie totul în Supabase și deschide cartea nou-creată
 * pe tab-ul collage.
 *
 * Ordinea salvării contează: întâi cartea (personajele se leagă de ea prin
 * book_id), apoi personajele.
 */

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  createBook,
  createCharacter,
  createRelationship,
  createFragment,
} from "@/hooks/use-tessera-data"
import type { Book, Character, Fragment, Relationship } from "@/types"
import { setPendingImages } from "@/lib/pending-images"
import { findOptimalPosition, type Point } from "@/lib/positioning"
import { useOnboarding } from "../OnboardingContext"

/** Culoare implicită pentru cotorul cărții dacă nu există niciun personaj. */
const DEFAULT_COVER = "#3a2820"

export default function DonePage() {
  const router = useRouter()
  const { data, reset } = useOnboarding()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Pregătim numerele o singură dată (input-urile sunt text).
  const totalChapters = Math.max(1, parseInt(data.totalChapters, 10) || 1)
  let currentChapter = Math.max(1, parseInt(data.currentChapter, 10) || 1)
  if (currentChapter > totalChapters) currentChapter = totalChapters
  // Dacă a citit deja toată cartea, nu ascundem nimic (filtrul anti-spoiler off).
  if (data.hasRead) currentChapter = totalChapters

  // Review: salvăm DOAR personajele aprobate și relațiile dintre ele.
  const approvedCharacters = data.characters.filter((c) => c.approved !== false)
  const approvedIds = new Set(approvedCharacters.map((c) => c.id))
  const savedRelationships = data.relationships.filter(
    (r) => approvedIds.has(r.fromCharacterId) && approvedIds.has(r.toCharacterId),
  )

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const bookId = crypto.randomUUID()

      const book: Book = {
        id: bookId,
        title: data.title.trim() || "Untitled book",
        author: data.author.trim(),
        year: parseInt(data.year, 10) || 0,
        // Limba vine de la AI dacă a completat; altfel rămâne goală.
        language: data.language,
        totalChapters,
        currentChapter,
        // Cotorul ia culoarea primului personaj aprobat, dacă există.
        coverColor: approvedCharacters[0]?.color ?? DEFAULT_COVER,
      }

      // 1. Cartea întâi (personajele o referențiază).
      await createBook(book)

      // 2. Apoi fiecare personaj. Câmpurile bogate (descriere/status/capitol) vin
      //    de la AI dacă există; pentru personajele adăugate manual punem valori
      //    implicite.
      for (const draft of approvedCharacters) {
        const character: Character = {
          id: draft.id,
          bookId,
          name: draft.name,
          nicknames: draft.nicknames,
          description: draft.description ?? "",
          tags: draft.tags,
          color: draft.color,
          status: draft.status ?? "alive",
          appearsInChapter: draft.appearsInChapter ?? 1,
          avatarType: "initial",
        }
        await createCharacter(character)
      }

      // 3. La final relațiile (au chei străine spre personaje, deci abia după ele).
      //    `savedRelationships` conține deja doar relațiile cu ambele capete aprobate.
      for (const draft of savedRelationships) {
        const relationship: Relationship = {
          id: draft.id,
          bookId,
          fromCharacterId: draft.fromCharacterId,
          toCharacterId: draft.toCharacterId,
          type: draft.type,
          label: draft.label,
          description: draft.description,
          strength: draft.strength,
          isSecret: draft.isSecret,
          revealedInChapter: draft.revealedInChapter,
        }
        await createRelationship(relationship)
      }

      // 3.5. Simbolurile introduse manual devin fragmente „symbol" pe board.
      //      Le creăm ACUM (după personaje: fragmentele au cheie străină spre ele).
      //      Le împrăștiem cu findOptimalPosition ca să nu se suprapună.
      const symbolPositions: Point[] = []
      for (const draft of approvedCharacters) {
        const symbol = draft.symbol?.trim()
        if (!symbol) continue
        const pos = findOptimalPosition(symbolPositions)
        symbolPositions.push(pos)
        const fragment: Fragment = {
          id: crypto.randomUUID(),
          bookId,
          characterId: draft.id,
          type: "symbol",
          content: symbol,
          position: { x: pos.x, y: pos.y, rotation: 0 },
          size: "medium",
        }
        await createFragment(fragment)
      }

      // 4. Imaginile durează ~30s de căutat — NU așteptăm aici. Lăsăm un bilet cu
      //    personajele care au query-uri vizuale; board-ul ridică biletul și caută
      //    imaginile în fundal, afișându-le pe măsură ce vin.
      const withQueries = approvedCharacters
        .filter((c) => (c.imageQueries?.length ?? 0) > 0)
        .map((c) => ({ id: c.id, imageQueries: c.imageQueries ?? [] }))
      if (withQueries.length > 0) {
        setPendingImages({ bookId, characters: withQueries })
      }

      // Golim flow-ul și deschidem cartea nouă IMEDIAT (nu mai blocăm pe imagini).
      reset()
      router.push(`/book/${bookId}?tab=collage`)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong while saving.")
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-1 flex-col items-center justify-center px-8 py-12">
        <p className="mb-6 text-xs uppercase tracking-[0.2em] text-muted-foreground">Almost there</p>
        <h1 className="mb-12 text-center font-serif text-4xl italic text-foreground md:text-5xl">
          Your universe is ready
        </h1>

        {/* Sumar */}
        <div className="w-full max-w-md space-y-6">
          {/* Cartea */}
          <div className="rounded border border-border bg-card/40 p-5">
            <p className="font-serif text-2xl italic text-foreground">
              {data.title.trim() || "Untitled book"}
            </p>
            {data.author.trim() && (
              <p className="mt-1 font-serif italic text-muted-foreground">{data.author}</p>
            )}
            <p className="mt-3 text-sm text-muted-foreground">
              {data.hasRead ? "You've already read it" : `You're on chapter ${currentChapter}`}
              {data.totalChapters.trim() && ` · ${totalChapters} chapters`}
            </p>
          </div>

          {/* Personajele */}
          <div>
            <p className="mb-3 text-xs uppercase tracking-[0.15em] text-muted-foreground">
              {approvedCharacters.length === 0
                ? "No characters — you can add them later"
                : `${approvedCharacters.length} characters` +
                  (savedRelationships.length > 0 ? ` · ${savedRelationships.length} relationships` : "")}
            </p>
            <div className="flex flex-wrap gap-2">
              {approvedCharacters.map((character) => (
                <span
                  key={character.id}
                  className="flex items-center gap-2 rounded-full border border-border bg-card/40 px-3 py-1.5"
                >
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: character.color }}
                    aria-hidden
                  />
                  <span className="font-serif text-sm italic text-foreground">
                    {character.name}
                  </span>
                </span>
              ))}
            </div>
          </div>

          {error && (
            <p className="rounded border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm italic text-destructive">
              {error}
            </p>
          )}
        </div>
      </div>

      {/* Navigare: înapoi + salvează */}
      <div className="flex justify-between p-8">
        <button
          onClick={() => router.push("/onboarding/characters")}
          disabled={saving}
          className="rounded border border-border px-6 py-3 font-serif italic text-foreground/80 transition-colors hover:bg-secondary/50 disabled:opacity-50"
        >
          &larr; back
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded bg-primary px-6 py-3 font-serif italic text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "saving…" : "open the universe →"}
        </button>
      </div>
    </div>
  )
}
