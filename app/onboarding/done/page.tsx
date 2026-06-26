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
import { createBook, createCharacter } from "@/hooks/use-tessera-data"
import type { Book, Character } from "@/types"
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
        language: "",
        totalChapters,
        currentChapter,
        // Cotorul ia culoarea primului personaj, dacă există.
        coverColor: data.characters[0]?.color ?? DEFAULT_COVER,
      }

      // 1. Cartea întâi (personajele o referențiază).
      await createBook(book)

      // 2. Apoi fiecare personaj.
      for (const draft of data.characters) {
        const character: Character = {
          id: draft.id,
          bookId,
          name: draft.name,
          nicknames: draft.nicknames,
          description: "",
          tags: draft.tags,
          color: draft.color,
          status: "alive",
          appearsInChapter: 1,
          avatarType: "initial",
        }
        await createCharacter(character)
      }

      // Golim flow-ul și deschidem cartea nouă.
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
              {data.characters.length === 0
                ? "No characters — you can add them later"
                : `${data.characters.length} characters`}
            </p>
            <div className="flex flex-wrap gap-2">
              {data.characters.map((character) => (
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
