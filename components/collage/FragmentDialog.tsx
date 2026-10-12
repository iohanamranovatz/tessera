"use client"

/**
 * FragmentDialog — formularul unui fragment, folosit ȘI la adăugare ȘI la editare.
 *
 * Înlocuiește vechiul AddFragmentDialog, care accepta DOAR text. Problema lui:
 * scriai un cuvânt, iar board-ul îl desena uriaș pe un card, fiindcă
 * FragmentContent randează imagine doar când conținutul e un URL. Utilizatorul
 * nu avea nicio cale să pună o poză a lui.
 *
 * Reparația de fond e în ordinea întrebărilor: PRIMA alegere e „imagine sau
 * text?", nu un tip de fragment abstract. Nu mai poți nimeri din greșeală un
 * cuvânt desenat mare — ori încarci o poză, ori alegi explicit că vrei text.
 */

import { useEffect, useRef, useState } from "react"
import { ImagePlus, Loader2, Type as TypeIcon, Upload } from "lucide-react"
import { Modal } from "@/components/ui/modal"
import { createFragment, updateFragment } from "@/hooks/use-tessera-data"
import { findOptimalPosition } from "@/lib/positioning"
import {
  UploadError,
  deleteFragmentImage,
  uploadFragmentImage,
  type UploadedImage,
} from "@/lib/supabase/upload"
import type { Character, Fragment, FragmentSize, FragmentType } from "@/types"

interface FragmentDialogProps {
  open: boolean
  onClose: () => void
  bookId: string
  characters: Character[]
  /** Pozițiile deja ocupate — ca un fragment nou să nu cadă peste altul. */
  existingFragments: Fragment[]
  /** Fragmentul editat, sau `null` când adăugăm unul nou. */
  editing: Fragment | null
  /** Chemat după o salvare reușită, ca board-ul să reîncarce. */
  onSaved: () => void
}

/** Tipurile de fragment TEXT. „Imagine" nu e aici: e un mod separat, vezi mai jos. */
const TEXT_TYPES: { value: FragmentType; label: string; hint: string }[] = [
  { value: "quote", label: "quote", hint: "“A line from the book…”" },
  { value: "symbol", label: "symbol", hint: "A single glyph, e.g. ∞ or †" },
  { value: "object", label: "object", hint: "e.g. a worn greatcoat" },
  { value: "place", label: "place", hint: "e.g. the monastery" },
  { value: "human", label: "human", hint: "e.g. the stranger" },
]

const SIZES: FragmentSize[] = ["small", "medium", "large"]

/** True dacă textul e un URL — adică fragmentul poartă o imagine. */
function isImageUrl(content: string): boolean {
  return /^https?:\/\//.test(content)
}

export function FragmentDialog({
  open,
  onClose,
  bookId,
  characters,
  existingFragments,
  editing,
  onSaved,
}: FragmentDialogProps) {
  const isEdit = editing !== null

  // --- câmpuri comune ---
  const [kind, setKind] = useState<"image" | "text">("image")
  const [characterId, setCharacterId] = useState("")
  const [label, setLabel] = useState("")
  const [size, setSize] = useState<FragmentSize>("medium")
  const [rotation, setRotation] = useState(0)

  // --- modul text ---
  const [type, setType] = useState<FragmentType>("quote")
  const [content, setContent] = useState("")

  // --- modul imagine ---
  /** Imaginea nou încărcată în sesiunea asta de dialog (dacă e vreuna). */
  const [uploaded, setUploaded] = useState<UploadedImage | null>(null)
  /** Imaginea EXISTENTĂ a fragmentului editat, cât timp n-a fost înlocuită. */
  const [existingImage, setExistingImage] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Încărcăm formularul de fiecare dată când se deschide: la editare din
  // fragmentul primit, la adăugare pe valori implicite curate.
  useEffect(() => {
    if (!open) return
    setError(null)
    setUploaded(null)

    if (editing) {
      const hasImage = isImageUrl(editing.content)
      setKind(hasImage ? "image" : "text")
      setExistingImage(hasImage ? (editing.imageMeta?.thumbUrl ?? editing.content) : null)
      setCharacterId(editing.characterId)
      setLabel(editing.label ?? "")
      setSize(editing.size)
      setRotation(editing.position.rotation)
      setType(hasImage ? "object" : editing.type)
      setContent(hasImage ? "" : editing.content)
    } else {
      setKind("image")
      setExistingImage(null)
      setCharacterId(characters[0]?.id ?? "")
      setLabel("")
      setSize("medium")
      // O înclinare aleatorie, ca la fragmentele generate automat — un colaj
      // de carduri perfect drepte arată ca o foaie de calcul.
      setRotation(Math.round(Math.random() * 16 - 8))
      setType("quote")
      setContent("")
    }
  }, [open, editing, characters])

  async function handleFile(file: File | undefined) {
    if (!file) return
    setUploading(true)
    setError(null)
    try {
      const result = await uploadFragmentImage(file)
      // Dacă userul încarcă de două ori la rând, prima poză devine orfană —
      // o ștergem acum, cât încă îi știm căile.
      if (uploaded) void deleteFragmentImage(uploaded)
      setUploaded(result)
    } catch (e) {
      setError(e instanceof UploadError ? e.message : "Couldn't upload that image.")
    } finally {
      setUploading(false)
    }
  }

  async function handleSubmit() {
    if (!characterId) {
      setError("Pick a character first.")
      return
    }
    if (kind === "image" && !uploaded && !existingImage) {
      setError("Choose an image to upload.")
      return
    }
    if (kind === "text" && !content.trim()) {
      setError("Write something for this fragment.")
      return
    }

    setSaving(true)
    setError(null)
    try {
      // Conținutul + metadatele depind de mod. La editare, dacă n-a fost
      // încărcată o poză nouă, păstrăm ce era.
      const imageMeta = uploaded
        ? {
            source: "upload" as const,
            license: "user-upload" as const,
            thumbUrl: uploaded.thumbUrl,
            storagePath: uploaded.storagePath,
            thumbStoragePath: uploaded.thumbStoragePath,
            requiresAttribution: false,
          }
        : editing?.imageMeta

      const base = {
        characterId,
        label: label.trim() || undefined,
        size,
      }

      // Scheletul pe care construim: fragmentul editat, sau unul nou. Îl
      // calculăm O SINGURĂ DATĂ — `emptyFragment` generează un id și o poziție
      // aleatorie, deci două apeluri ar da două poziții diferite.
      const draft = editing ?? emptyFragment(bookId, existingFragments)

      const payload: Fragment =
        kind === "image"
          ? {
              ...draft,
              ...base,
              // „object" e tipul gândit să poarte imagini (vezi types/index.ts).
              type: "object",
              content: uploaded ? uploaded.url : draft.content,
              imageMeta,
              position: { ...draft.position, rotation },
            }
          : {
              ...draft,
              ...base,
              type,
              content: content.trim(),
              // Trecem de la imagine la text: metadatele imaginii nu mai au sens.
              imageMeta: undefined,
              position: { ...draft.position, rotation },
            }

      if (isEdit) {
        await updateFragment(payload)
        // Abia DUPĂ ce salvarea a reușit ștergem pozele vechi — altfel o eroare
        // ne-ar lăsa cu un fragment care arată spre fișiere inexistente.
        const replaced = uploaded && editing?.imageMeta?.storagePath
        const switchedToText = kind === "text" && editing?.imageMeta?.storagePath
        if (replaced || switchedToText) void deleteFragmentImage(editing!.imageMeta)
      } else {
        await createFragment(payload)
      }

      onSaved()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save that fragment.")
    } finally {
      setSaving(false)
    }
  }

  /** Închidere fără salvare: poza urcată devine orfană, deci o curățăm. */
  function handleCancel() {
    if (uploaded) void deleteFragmentImage(uploaded)
    onClose()
  }

  const inputClass =
    "w-full rounded border border-border bg-secondary px-3 py-2 font-serif text-sm text-foreground focus:border-primary focus:outline-none"

  const preview = uploaded?.thumbUrl ?? existingImage

  return (
    <Modal
      open={open}
      onClose={handleCancel}
      title={isEdit ? "Edit fragment" : "Add a fragment"}
    >
      {/* Coloană: câmpurile derulează, butoanele stau mereu la vedere.
          Dacă butoanele ar fi în zona derulabilă (cum erau), pe ecrane scunde
          „save" ar rămâne sub marginea de jos și ar trebui căutat prin derulare —
          exact acțiunea principală a dialogului. */}
      <div className="flex max-h-[75vh] flex-col" data-testid="fragment-dialog">
        <div className="flex flex-col gap-4 overflow-y-auto px-1 pb-1">
        {/* PRIMA alegere: imagine sau text. Asta e ce lipsea. */}
        <div className="grid grid-cols-2 gap-2">
          <KindButton
            active={kind === "image"}
            onClick={() => setKind("image")}
            icon={<ImagePlus className="h-4 w-4" />}
            label="image"
            testid="fragment-kind-image"
          />
          <KindButton
            active={kind === "text"}
            onClick={() => setKind("text")}
            icon={<TypeIcon className="h-4 w-4" />}
            label="text"
            testid="fragment-kind-text"
          />
        </div>

        {kind === "image" ? (
          <div className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">image</span>
            {/* Zona de încărcare: click sau drag-and-drop. */}
            <div
              onClick={() => !uploading && fileInput.current?.click()}
              onDragOver={(e) => {
                e.preventDefault()
                setDragOver(true)
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault()
                setDragOver(false)
                void handleFile(e.dataTransfer.files[0])
              }}
              data-testid="fragment-dropzone"
              className={`flex min-h-[9rem] cursor-pointer flex-col items-center justify-center gap-2 rounded border border-dashed p-3 text-center transition-colors ${
                dragOver ? "border-primary bg-primary/10" : "border-border bg-secondary/50"
              }`}
            >
              {uploading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  <span className="font-serif text-xs italic text-muted-foreground">
                    uploading…
                  </span>
                </>
              ) : preview ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={preview}
                    alt=""
                    className="max-h-28 w-auto rounded object-contain shadow"
                  />
                  <span className="font-serif text-xs italic text-muted-foreground">
                    click to replace
                  </span>
                </>
              ) : (
                <>
                  <Upload className="h-5 w-5 text-muted-foreground" />
                  <span className="font-serif text-xs italic text-muted-foreground">
                    click or drop an image here
                  </span>
                  <span className="text-[0.65rem] text-muted-foreground/70">
                    JPG, PNG, WebP or GIF · up to 8 MB
                  </span>
                </>
              )}
            </div>
            <input
              ref={fileInput}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              data-testid="fragment-file-input"
              onChange={(e) => {
                void handleFile(e.target.files?.[0])
                e.target.value = "" // ca re-alegerea aceluiași fișier să declanșeze iar
              }}
            />
          </div>
        ) : (
          <>
            {/* Tip de text */}
            <label className="flex flex-col gap-1">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">
                kind of text
              </span>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as FragmentType)}
                className={inputClass}
                data-testid="fragment-type"
              >
                {TEXT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>

            {/* Conținut */}
            <label className="flex flex-col gap-1">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">
                content
              </span>
              {type === "quote" ? (
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={3}
                  placeholder={TEXT_TYPES.find((t) => t.value === type)?.hint}
                  className={inputClass}
                  data-testid="fragment-content"
                />
              ) : (
                <input
                  type="text"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={TEXT_TYPES.find((t) => t.value === type)?.hint}
                  className={inputClass}
                  data-testid="fragment-content"
                />
              )}
            </label>
          </>
        )}

        {/* Personaj — dă culoarea haloului din jurul cardului. */}
        <label className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">character</span>
          <select
            value={characterId}
            onChange={(e) => setCharacterId(e.target.value)}
            className={inputClass}
            data-testid="fragment-character"
          >
            {characters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        {/* Etichetă */}
        <label className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">
            caption <span className="normal-case">(optional)</span>
          </span>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="shown under the card"
            className={inputClass}
            data-testid="fragment-label"
          />
        </label>

        {/* Mărime */}
        <div className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">size</span>
          <div className="grid grid-cols-3 gap-2">
            {SIZES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSize(s)}
                data-testid={`fragment-size-${s}`}
                className={`rounded border px-3 py-2 font-serif text-xs italic transition-colors ${
                  size === s
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Rotație */}
        <label className="flex flex-col gap-1">
          <span className="flex justify-between text-xs uppercase tracking-wide text-muted-foreground">
            <span>tilt</span>
            <span className="tabular-nums">{rotation}°</span>
          </span>
          <input
            type="range"
            min={-15}
            max={15}
            step={1}
            value={rotation}
            onChange={(e) => setRotation(Number(e.target.value))}
            className="accent-primary"
            data-testid="fragment-rotation"
          />
        </label>

        </div>

        {/* Eroarea stă lângă butoane, NU în zona derulabilă: altfel ai putea
            apăsa „save", nu s-ar întâmpla nimic vizibil, iar motivul ar fi
            derulat în afara ecranului. */}
        {error && (
          <p
            className="mt-3 rounded border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive"
            data-testid="fragment-error"
          >
            {error}
          </p>
        )}

        <div className="mt-4 flex justify-end gap-2 border-t border-border/60 pt-4">
          <button
            onClick={handleCancel}
            disabled={saving}
            className="rounded border border-muted-foreground/40 px-4 py-2 font-serif text-sm italic text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
          >
            cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || uploading}
            data-testid="fragment-save"
            className="rounded bg-primary px-4 py-2 font-serif text-sm italic text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? "saving…" : isEdit ? "save" : "add"}
          </button>
        </div>
      </div>
    </Modal>
  )
}

/** Butonul mare de alegere a modului (imagine / text). */
function KindButton({
  active,
  onClick,
  icon,
  label,
  testid,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
  testid: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testid}
      aria-pressed={active}
      className={`flex items-center justify-center gap-2 rounded border px-3 py-2 font-serif text-sm italic transition-colors ${
        active
          ? "border-primary bg-primary/15 text-primary"
          : "border-border text-muted-foreground hover:text-foreground"
      }`}
    >
      {icon}
      {label}
    </button>
  )
}

/**
 * Scheletul unui fragment nou: id proaspăt și o poziție liberă pe board.
 * Câmpurile care contează le suprascrie apelantul.
 */
function emptyFragment(bookId: string, existing: Fragment[]): Fragment {
  const { x, y } = findOptimalPosition(existing.map((f) => f.position))
  return {
    id: crypto.randomUUID(),
    bookId,
    characterId: "",
    type: "object",
    content: "",
    position: { x: Math.round(x), y: Math.round(y), rotation: 0 },
    size: "medium",
  }
}
