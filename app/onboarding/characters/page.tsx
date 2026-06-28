"use client"

/**
 * Ecranul 3 — „Cine sunt personajele?"
 *
 * Începe cu o listă goală. Butonul „+" deschide un formular în care adaugi
 * un personaj manual: nume, porecle, taguri și o culoare din paletă.
 * Fiecare personaj adăugat se ține în OnboardingContext (încă nesalvat în DB).
 *
 * Poți continua și fără niciun personaj — îi poți adăuga oricând mai târziu,
 * direct în carte.
 */

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Check, Plus, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { useOnboarding, type OnboardingCharacterDraft } from "../OnboardingContext"

/** Paleta de accente dark-academia (aceeași ca în fișa de personaj). */
const PALETTE: { value: string; label: string }[] = [
  { value: "#8a3020", label: "red" },
  { value: "#2a4a5a", label: "cold blue" },
  { value: "#8a6a28", label: "gold" },
  { value: "#3a2820", label: "dark brown" },
]

export default function CharactersPage() {
  const router = useRouter()
  const { data, addCharacter, updateCharacter } = useOnboarding()
  const [showForm, setShowForm] = useState(false)

  // Paleta sugerată = culorile distincte ale personajelor APROBATE (se actualizează
  // pe măsură ce aprobi/respingi).
  const paletteColors = [
    ...new Set(data.characters.filter((c) => c.approved !== false).map((c) => c.color)),
  ]

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-1 flex-col items-center px-8 py-12">
        <p className="mb-6 text-xs uppercase tracking-[0.2em] text-muted-foreground">Characters</p>
        <h1 className="mb-8 text-center font-serif text-4xl italic text-foreground md:text-5xl">
          Who populates this world?
        </h1>

        <div className="w-full max-w-md space-y-4">
          {/* Lista de personaje adăugate */}
          {data.characters.length === 0 && !showForm && (
            <p className="py-6 text-center font-serif italic text-muted-foreground">
              No characters yet. Add the first one with “+”.
            </p>
          )}

          {/* Paleta sugerată + îndrumarea de review (doar când avem personaje) */}
          {data.characters.length > 0 && (
            <div className="space-y-3 pb-1">
              <p className="text-center text-sm italic text-muted-foreground">
                Keep or leave out each character before you continue.
              </p>
              {paletteColors.length > 0 && (
                <div className="flex items-center justify-center gap-2">
                  <span className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
                    Palette
                  </span>
                  <div className="flex gap-1.5">
                    {paletteColors.map((color) => (
                      <span
                        key={color}
                        className="h-4 w-4 rounded-full"
                        style={{ backgroundColor: color }}
                        aria-hidden
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {data.characters.map((character) => (
            <CharacterRow
              key={character.id}
              character={character}
              onToggle={() =>
                updateCharacter(character.id, { approved: character.approved === false })
              }
            />
          ))}

          {/* Formularul de adăugare (apare doar când apeși „+") */}
          {showForm ? (
            <AddCharacterForm
              onAdd={(draft) => {
                addCharacter(draft)
                setShowForm(false)
              }}
              onCancel={() => setShowForm(false)}
            />
          ) : (
            <button
              onClick={() => setShowForm(true)}
              className="flex w-full items-center justify-center gap-2 rounded border border-dashed border-muted-foreground/40 py-3 font-serif italic text-muted-foreground transition-colors hover:border-primary hover:text-primary"
            >
              <Plus className="h-4 w-4" />
              add a character
            </button>
          )}
        </div>
      </div>

      {/* Navigare: înapoi + înainte */}
      <div className="flex justify-between p-8">
        <button
          onClick={() => router.push("/onboarding/context")}
          className="rounded border border-border px-6 py-3 font-serif italic text-foreground/80 transition-colors hover:bg-secondary/50"
        >
          &larr; back
        </button>
        <button
          onClick={() => router.push("/onboarding/done")}
          className="rounded bg-primary px-6 py-3 font-serif italic text-primary-foreground transition-colors hover:bg-primary/90"
        >
          continue &rarr;
        </button>
      </div>
    </div>
  )
}

/**
 * Un rând din listă pentru review: culoare + nume + porecle + descriere + taguri,
 * cu un buton ✓/✗ care aprobă sau respinge personajul. Cele respinse rămân în
 * listă (estompate, tăiate) ca să te poți răzgândi — dar nu se salvează.
 */
function CharacterRow({
  character,
  onToggle,
}: {
  character: OnboardingCharacterDraft
  onToggle: () => void
}) {
  const approved = character.approved !== false

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded border px-4 py-3 transition-all",
        approved ? "border-border bg-card/40" : "border-border/40 bg-card/20 opacity-45",
      )}
    >
      <span
        className="mt-1 h-4 w-4 shrink-0 rounded-full"
        style={{ backgroundColor: character.color }}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "truncate font-serif italic text-foreground",
            !approved && "line-through",
          )}
        >
          {character.name}
        </p>
        {character.nicknames.length > 0 && (
          <p className="truncate text-xs text-muted-foreground">
            {character.nicknames.join(", ")}
          </p>
        )}
        {character.description && (
          <p className="mt-1 line-clamp-2 text-xs italic text-muted-foreground/80">
            {character.description}
          </p>
        )}
        {character.tags.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {character.tags.slice(0, 4).map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-border/60 px-2 py-0.5 text-[10px] text-muted-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
      <button
        onClick={onToggle}
        aria-label={approved ? "Leave out this character" : "Keep this character"}
        className={cn(
          "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-colors",
          approved
            ? "border-primary bg-primary text-primary-foreground hover:bg-primary/90"
            : "border-muted-foreground/40 text-muted-foreground hover:border-primary hover:text-primary",
        )}
      >
        {approved ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
      </button>
    </div>
  )
}

/**
 * Formularul de adăugare. Își ține propriile valori locale și, la „adaugă",
 * construiește un OnboardingCharacterDraft cu un id nou și îl trimite sus.
 */
function AddCharacterForm({
  onAdd,
  onCancel,
}: {
  onAdd: (draft: OnboardingCharacterDraft) => void
  onCancel: () => void
}) {
  const [name, setName] = useState("")
  const [nicknames, setNicknames] = useState("")
  const [tags, setTags] = useState("")
  const [color, setColor] = useState(PALETTE[0].value)

  const canAdd = name.trim().length > 0

  /** Transformă un text „a, b, c" într-un array curat ["a", "b", "c"]. */
  function splitList(text: string): string[] {
    return text
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item.length > 0)
  }

  function handleAdd() {
    if (!canAdd) return
    onAdd({
      id: crypto.randomUUID(),
      name: name.trim(),
      nicknames: splitList(nicknames),
      tags: splitList(tags),
      color,
    })
  }

  return (
    <div className="space-y-4 rounded border border-primary/40 bg-card/40 p-4">
      <FormInput label="Name" value={name} onChange={setName} placeholder="Dmitri Karamazov" />
      <FormInput
        label="Nicknames (comma-separated)"
        value={nicknames}
        onChange={setNicknames}
        placeholder="Mitya, Mitka, Mitenka"
      />
      <FormInput
        label="Tags (comma-separated)"
        value={tags}
        onChange={setTags}
        placeholder="passionate, military, impulsive"
      />

      {/* Selector de culoare */}
      <div>
        <span className="mb-2 block text-xs uppercase tracking-[0.15em] text-muted-foreground">
          Color
        </span>
        <div className="flex gap-3">
          {PALETTE.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setColor(option.value)}
              title={option.label}
              aria-label={option.label}
              className={`h-8 w-8 rounded-full transition-transform hover:scale-110 ${
                color === option.value ? "ring-2 ring-primary ring-offset-2 ring-offset-card" : ""
              }`}
              style={{ backgroundColor: option.value }}
            />
          ))}
        </div>
      </div>

      {/* Acțiuni */}
      <div className="flex justify-end gap-2 pt-2">
        <button
          onClick={onCancel}
          className="rounded px-4 py-2 font-serif text-sm italic text-muted-foreground transition-colors hover:text-foreground"
        >
          cancel
        </button>
        <button
          onClick={handleAdd}
          disabled={!canAdd}
          className="rounded bg-primary px-4 py-2 font-serif text-sm italic text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          add
        </button>
      </div>
    </div>
  )
}

/** Input text simplu pentru formular (cu etichetă deasupra). */
function FormInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs uppercase tracking-[0.15em] text-muted-foreground">
        {label}
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border-b border-muted-foreground/40 bg-transparent pb-2 font-serif italic text-foreground transition-colors placeholder:text-muted-foreground/40 focus:border-primary focus:outline-none"
      />
    </label>
  )
}
