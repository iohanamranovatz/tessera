"use client"

/**
 * AddFragmentDialog — form for creating a new fragment.
 *
 * Lets the user pick a character + type, type some content, then:
 *   1. generates a new id
 *   2. finds an empty-ish position on the board
 *   3. picks a random rotation between -8° and +8°
 *   4. saves to Supabase
 *   5. refreshes the board and closes
 */

import { useEffect, useState } from "react"
import { Modal } from "@/components/ui/modal"
import { createFragment } from "@/hooks/use-tessera-data"
import { findOptimalPosition } from "@/lib/positioning"
import type { Character, Fragment, FragmentType } from "@/types"

interface AddFragmentDialogProps {
  open: boolean
  onClose: () => void
  bookId: string
  characters: Character[]
  existingFragments: Fragment[]
  /** Called after a successful save so the board can reload. */
  onAdded: () => void
}

const FRAGMENT_TYPES: { value: FragmentType; label: string }[] = [
  { value: "object", label: "object" },
  { value: "quote", label: "quote" },
  { value: "place", label: "place" },
  { value: "symbol", label: "symbol" },
  { value: "human", label: "human" },
]

export function AddFragmentDialog({
  open,
  onClose,
  bookId,
  characters,
  existingFragments,
  onAdded,
}: AddFragmentDialogProps) {
  const [characterId, setCharacterId] = useState("")
  const [type, setType] = useState<FragmentType>("object")
  const [content, setContent] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Default the character dropdown to the first one once characters load.
  useEffect(() => {
    if (!characterId && characters.length > 0) {
      setCharacterId(characters[0].id)
    }
  }, [characters, characterId])

  async function handleSubmit() {
    if (!characterId || !content.trim()) {
      setError("Choose a character and fill in the content.")
      return
    }
    setSaving(true)
    setError(null)
    try {
      const { x, y } = findOptimalPosition(existingFragments)
      const rotation = Math.round(Math.random() * 16 - 8) // -8..+8

      const newFragment: Fragment = {
        id: crypto.randomUUID(),
        bookId,
        characterId,
        type,
        content: content.trim(),
        position: { x: Math.round(x), y: Math.round(y), rotation },
        size: "medium",
      }

      await createFragment(newFragment)
      setContent("")
      onAdded()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save.")
    } finally {
      setSaving(false)
    }
  }

  const inputClass =
    "w-full rounded border border-border bg-secondary px-3 py-2 font-serif text-sm text-foreground focus:border-primary focus:outline-none"

  return (
    <Modal open={open} onClose={onClose} title="Add a fragment">
      <div className="flex flex-col gap-4">
        {/* Character */}
        <label className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">character</span>
          <select
            value={characterId}
            onChange={(e) => setCharacterId(e.target.value)}
            className={inputClass}
          >
            {characters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        {/* Type */}
        <label className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">type</span>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as FragmentType)}
            className={inputClass}
          >
            {FRAGMENT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>

        {/* Content — textarea for quotes, input for everything else */}
        <label className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">content</span>
          {type === "quote" ? (
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={3}
              placeholder="“A quote from the book…”"
              className={inputClass}
            />
          ) : (
            <input
              type="text"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="e.g. uniform, icon, cognac…"
              className={inputClass}
            />
          )}
        </label>

        {error && <p className="text-xs text-destructive">{error}</p>}

        {/* Actions */}
        <div className="mt-2 flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={saving}
            className="rounded border border-muted-foreground/40 px-4 py-2 font-serif text-sm italic text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
          >
            cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="rounded bg-primary px-4 py-2 font-serif text-sm italic text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? "saving…" : "add"}
          </button>
        </div>
      </div>
    </Modal>
  )
}
