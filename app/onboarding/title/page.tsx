"use client"

/**
 * Ecranul 1 — „Ce carte citești?"
 *
 * Strânge datele de bază ale cărții: titlu, autor, an, număr de capitole.
 * Doar titlul e obligatoriu pentru a putea continua; restul pot rămâne goale
 * (le completăm cu valori implicite la salvare, în etapa următoare).
 */

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Feather } from "lucide-react"
import { useOnboarding, type OnboardingData } from "../OnboardingContext"
import type { AiBookResult } from "@/lib/book-ai"

export default function TitlePage() {
  const router = useRouter()
  const { data, setField, setCharacters, setRelationships } = useOnboarding()

  // Stare pentru completarea cu AI: „se încarcă?" + un mesaj (succes sau eroare).
  const [aiLoading, setAiLoading] = useState(false)
  const [aiNote, setAiNote] = useState<{ kind: "ok" | "err"; text: string } | null>(null)

  const canContinue = data.title.trim().length > 0

  /**
   * Cheamă ruta server /api/generate-book cu titlul (+ autorul, dacă există) și
   * pre-completează formularul: autor, an, capitole și lista de personaje.
   * Relațiile/descrierile vin de la AI, dar onboarding-ul nu le salvează încă —
   * le legăm într-o etapă următoare.
   */
  async function fillWithAi() {
    if (!canContinue || aiLoading) return
    setAiLoading(true)
    setAiNote(null)
    try {
      const res = await fetch("/api/generate-book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: data.title.trim(),
          author: data.author.trim() || undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "The archive stayed silent.")

      const result = json as AiBookResult

      // Completăm doar câmpurile goale pentru autor; restul le punem mereu.
      if (result.book.author && !data.author.trim()) setField("author", result.book.author)
      if (result.book.year) setField("year", String(result.book.year))
      if (result.book.totalChapters) setField("totalChapters", String(result.book.totalChapters))
      if (result.book.language) setField("language", result.book.language)

      // Personajele AI → schițe (cu id nou). Reținem un map nume → id, ca să putem
      // lega relațiile (AI le dă prin nume, nu prin id).
      const nameToId = new Map<string, string>()
      const characterDrafts = result.characters.map((c) => {
        const id = crypto.randomUUID()
        nameToId.set(c.name, id)
        return {
          id,
          name: c.name,
          nicknames: c.nicknames,
          tags: c.tags,
          color: c.color,
          description: c.description,
          status: c.status,
          appearsInChapter: c.appearsInChapter,
        }
      })

      // Relațiile AI → schițe, traducând fromName/toName în id-uri. Sărim peste
      // relațiile ale căror capete nu se regăsesc printre personaje.
      const relationshipDrafts = result.relationships.flatMap((r) => {
        const fromId = nameToId.get(r.fromName)
        const toId = nameToId.get(r.toName)
        if (!fromId || !toId) return []
        return [
          {
            id: crypto.randomUUID(),
            fromCharacterId: fromId,
            toCharacterId: toId,
            type: r.type,
            label: r.label,
            description: r.description,
            strength: r.strength,
            isSecret: r.isSecret,
            revealedInChapter: r.revealedInChapter,
          },
        ]
      })

      setCharacters(characterDrafts)
      setRelationships(relationshipDrafts)

      setAiNote(
        result.characters.length > 0
          ? {
              kind: "ok",
              text: `Found ${result.characters.length} characters and ${relationshipDrafts.length} relationships — review them ahead.`,
            }
          : { kind: "err", text: "Couldn't find that book — add the characters yourself." },
      )
    } catch (e) {
      setAiNote({ kind: "err", text: e instanceof Error ? e.message : "Something went wrong." })
    } finally {
      setAiLoading(false)
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-1 flex-col items-center justify-center px-8 py-12">
        <p className="mb-6 text-xs uppercase tracking-[0.2em] text-muted-foreground">A new world</p>
        <h1 className="mb-12 text-center font-serif text-4xl italic text-foreground md:text-5xl">
          What are you reading?
        </h1>

        <div className="w-full max-w-md space-y-8">
          <TextField
            label="Title"
            field="title"
            value={data.title}
            onChange={setField}
            placeholder="The Brothers Karamazov"
          />
          <TextField
            label="Author"
            field="author"
            value={data.author}
            onChange={setField}
            placeholder="Fyodor Dostoevsky"
          />

          <div className="flex gap-6">
            <TextField
              label="Year"
              field="year"
              value={data.year}
              onChange={setField}
              placeholder="1880"
              numeric
            />
            <TextField
              label="Number of chapters"
              field="totalChapters"
              value={data.totalChapters}
              onChange={setField}
              placeholder="12"
              numeric
            />
          </div>

          {/* Completare automată cu AI — apare după ce ai scris un titlu. */}
          <div className="space-y-3 pt-2">
            <button
              type="button"
              onClick={fillWithAi}
              disabled={!canContinue || aiLoading}
              className="flex w-full items-center justify-center gap-2 rounded border border-dashed border-muted-foreground/40 py-3 font-serif italic text-muted-foreground transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-muted-foreground/40 disabled:hover:text-muted-foreground"
            >
              <Feather className={`h-4 w-4 ${aiLoading ? "animate-pulse" : ""}`} />
              {aiLoading ? "consulting the archive…" : "fill with AI"}
            </button>

            {aiNote && (
              <p
                className={`text-center text-sm italic ${
                  aiNote.kind === "ok" ? "text-muted-foreground" : "text-destructive"
                }`}
              >
                {aiNote.text}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Navigare: doar înainte (suntem pe primul ecran) */}
      <div className="flex justify-end p-8">
        <button
          onClick={() => router.push("/onboarding/context")}
          disabled={!canContinue}
          className="rounded bg-primary px-6 py-3 font-serif italic text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          continue &rarr;
        </button>
      </div>
    </div>
  )
}

/**
 * Un câmp text reutilizabil, stilizat ca în restul aplicației (linie dedesubt).
 * `field` spune ce cheie din OnboardingData să actualizeze; `numeric` pune
 * tastatura numerică pe mobil pentru an / capitole.
 */
function TextField({
  label,
  field,
  value,
  onChange,
  placeholder,
  numeric,
}: {
  label: string
  field: keyof OnboardingData
  value: string
  onChange: <K extends keyof OnboardingData>(key: K, value: OnboardingData[K]) => void
  placeholder?: string
  numeric?: boolean
}) {
  return (
    <label className="block w-full">
      <span className="mb-2 block text-xs uppercase tracking-[0.15em] text-muted-foreground">
        {label}
      </span>
      <input
        type="text"
        inputMode={numeric ? "numeric" : "text"}
        value={value}
        onChange={(e) => onChange(field, e.target.value)}
        placeholder={placeholder}
        className="w-full border-b border-muted-foreground/40 bg-transparent pb-2 font-serif text-xl italic text-foreground transition-colors placeholder:text-muted-foreground/40 focus:border-primary focus:outline-none"
      />
    </label>
  )
}
