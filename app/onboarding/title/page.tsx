"use client"

/**
 * Ecranul 1 — „Ce carte citești?"
 *
 * Strânge datele de bază ale cărții: titlu, autor, an, număr de capitole.
 * Doar titlul e obligatoriu pentru a putea continua; restul pot rămâne goale
 * (le completăm cu valori implicite la salvare, în etapa următoare).
 */

import { useRouter } from "next/navigation"
import { useOnboarding, type OnboardingData } from "../OnboardingContext"

export default function TitlePage() {
  const router = useRouter()
  const { data, setField } = useOnboarding()

  const canContinue = data.title.trim().length > 0

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
