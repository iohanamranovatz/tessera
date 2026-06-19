"use client"

/**
 * CharacterDetailDialog — view + edit modal for a single character.
 *
 * Two jobs in one component:
 *  - VIEW mode: shows the full character (description, all nicknames/tags,
 *    status, chapter, relation/fragment counts) with an "edit" button.
 *  - EDIT mode: a form to change every field, then save to Supabase.
 *
 * It also doubles as the "new character" form: when `isNew` is true the dialog
 * opens straight into EDIT mode with a blank character.
 *
 * Lists like nicknames and tags are edited as simple comma-separated text —
 * the easiest thing for a beginner-friendly UI.
 */

import { useEffect, useState } from "react"
import { Modal } from "@/components/ui/modal"
import { createCharacter, updateCharacter } from "@/hooks/use-tessera-data"
import type { Character, CharacterStatus } from "@/types"

interface CharacterDetailDialogProps {
  open: boolean
  onClose: () => void
  /** The character to show/edit. For a brand-new character pass a blank one. */
  character: Character | null
  /** When true, open in edit mode and INSERT instead of UPDATE on save. */
  isNew?: boolean
  relationsCount?: number
  fragmentsCount?: number
  /** Called after a successful save so the grid can reload. */
  onSaved: () => void
}

/** Accent colours from the dark-academia palette (Stage 4 spec). */
const PALETTE: { value: string; label: string }[] = [
  { value: "#8a3020", label: "roșu" },
  { value: "#2a4a5a", label: "albastru-rece" },
  { value: "#8a6a28", label: "auriu" },
  { value: "#3a2820", label: "maro-închis" },
  { value: "#8a4a5a", label: "prună" },
  { value: "#6a6a3a", label: "măsliniu" },
  { value: "#5a4a3a", label: "lut" },
]

const STATUS_OPTIONS: { value: CharacterStatus; label: string }[] = [
  { value: "alive", label: "în viață" },
  { value: "dead", label: "decedat(ă)" },
  { value: "unknown", label: "necunoscut" },
]

const STATUS_LABEL: Record<CharacterStatus, string> = {
  alive: "în viață",
  dead: "decedat(ă)",
  unknown: "necunoscut",
}

const inputClass =
  "w-full rounded border border-border bg-secondary px-3 py-2 font-serif text-sm text-foreground focus:border-primary focus:outline-none"

export function CharacterDetailDialog({
  open,
  onClose,
  character,
  isNew = false,
  relationsCount = 0,
  fragmentsCount = 0,
  onSaved,
}: CharacterDetailDialogProps) {
  const [editing, setEditing] = useState(isNew)

  // Form fields (nicknames/tags edited as comma-separated strings).
  const [name, setName] = useState("")
  const [nicknames, setNicknames] = useState("")
  const [description, setDescription] = useState("")
  const [tags, setTags] = useState("")
  const [color, setColor] = useState(PALETTE[0].value)
  const [status, setStatus] = useState<CharacterStatus>("alive")
  const [appearsInChapter, setAppearsInChapter] = useState(1)

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Whenever the dialog opens (or the target character changes) reset the form
  // to that character's values and pick the right starting mode.
  useEffect(() => {
    if (!open) return
    setEditing(isNew)
    setError(null)
    setName(character?.name ?? "")
    setNicknames((character?.nicknames ?? []).join(", "))
    setDescription(character?.description ?? "")
    setTags((character?.tags ?? []).join(", "))
    setColor(character?.color ?? PALETTE[0].value)
    setStatus(character?.status ?? "alive")
    setAppearsInChapter(character?.appearsInChapter ?? 1)
  }, [open, isNew, character])

  // Turn "a, b, c" into ["a", "b", "c"], dropping blanks.
  function parseList(text: string): string[] {
    return text
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  }

  async function handleSave() {
    if (!name.trim()) {
      setError("Numele personajului este obligatoriu.")
      return
    }
    setSaving(true)
    setError(null)
    try {
      const payload: Character = {
        id: character?.id ?? crypto.randomUUID(),
        bookId: character!.bookId,
        name: name.trim(),
        nicknames: parseList(nicknames),
        description: description.trim(),
        tags: parseList(tags),
        color,
        status,
        appearsInChapter,
        avatarType: character?.avatarType ?? "initial",
      }

      if (isNew) {
        await createCharacter(payload)
      } else {
        await updateCharacter(payload)
      }
      onSaved()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Eroare la salvare.")
    } finally {
      setSaving(false)
    }
  }

  if (!character) return null

  const title = isNew ? "Personaj nou" : editing ? "Editează personajul" : character.name

  return (
    <Modal open={open} onClose={onClose} title={title}>
      {editing ? (
        /* ---------- EDIT / NEW form ---------- */
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">nume</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ex. Dmitri Fyodorovich Karamazov"
              className={inputClass}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">
              porecle (separate prin virgulă)
            </span>
            <input
              type="text"
              value={nicknames}
              onChange={(e) => setNicknames(e.target.value)}
              placeholder="Mitya, Mitka, Mitenka"
              className={inputClass}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">descriere</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Scurtă descriere, fără spoilere…"
              className={inputClass}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">
              tag-uri (separate prin virgulă)
            </span>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="passionate, military, impulsive"
              className={inputClass}
            />
          </label>

          {/* Colour swatches */}
          <div className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">culoare</span>
            <div className="flex flex-wrap gap-2">
              {PALETTE.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
                  title={c.label}
                  style={{ backgroundColor: c.value }}
                  className={`h-7 w-7 rounded-full border-2 transition-transform hover:scale-110 ${
                    color === c.value ? "border-primary" : "border-transparent"
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <label className="flex flex-1 flex-col gap-1">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">status</span>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as CharacterStatus)}
                className={inputClass}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex w-28 flex-col gap-1">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">
                apare în cap.
              </span>
              <input
                type="number"
                min={1}
                value={appearsInChapter}
                onChange={(e) => setAppearsInChapter(Number(e.target.value) || 1)}
                className={inputClass}
              />
            </label>
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <div className="mt-2 flex justify-end gap-2">
            <button
              onClick={isNew ? onClose : () => setEditing(false)}
              disabled={saving}
              className="rounded border border-muted-foreground/40 px-4 py-2 font-serif text-sm italic text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
            >
              anulează
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded bg-primary px-4 py-2 font-serif text-sm italic text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? "se salvează…" : "salvează"}
            </button>
          </div>
        </div>
      ) : (
        /* ---------- VIEW mode ---------- */
        <div className="flex flex-col gap-4">
          {/* Accent strip in the character's colour */}
          <div className="h-1 w-16 rounded-full" style={{ backgroundColor: character.color }} />

          {character.nicknames.length > 0 && (
            <p className="text-sm italic text-muted-foreground">
              {character.nicknames.join(" · ")}
            </p>
          )}

          {character.description && (
            <p className="font-serif text-sm leading-relaxed text-foreground/90">
              {character.description}
            </p>
          )}

          {character.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {character.tags.map((tag) => (
                <span
                  key={tag}
                  style={{
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

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-serif text-muted-foreground">
            <span>status: {STATUS_LABEL[character.status]}</span>
            <span>apare în cap. {character.appearsInChapter}</span>
            <span>
              {relationsCount} relations · {fragmentsCount} fragments
            </span>
          </div>

          <div className="mt-2 flex justify-end">
            <button
              onClick={() => setEditing(true)}
              className="rounded bg-primary px-4 py-2 font-serif text-sm italic text-primary-foreground transition-colors hover:bg-primary/90"
            >
              editează
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}
