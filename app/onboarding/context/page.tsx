"use client"

/**
 * Ecranul 2 — „Unde te afli în carte?"
 *
 * Două întrebări:
 *  - Ai citit deja cartea? (Da / Nu) → controlează cât de strict e filtrul anti-spoiler.
 *  - La ce capitol ești? → capitolul curent, sub care nimic nu e considerat spoiler.
 *
 * Datele se salvează în OnboardingContext, deci userul poate merge înapoi la
 * ecranul 1 și reveni fără să piardă nimic.
 */

import { useRouter } from "next/navigation"
import { useOnboarding } from "../OnboardingContext"

export default function ContextPage() {
  const router = useRouter()
  const { data, setField } = useOnboarding()

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-1 flex-col items-center justify-center px-8 py-12">
        <p className="mb-6 text-xs uppercase tracking-[0.2em] text-muted-foreground">Your context</p>
        <h1 className="mb-12 text-center font-serif text-4xl italic text-foreground md:text-5xl">
          Where are you in the book?
        </h1>

        <div className="w-full max-w-md space-y-12">
          {/* Întrebarea 1: ai citit cartea? */}
          <div>
            <span className="mb-4 block text-center font-serif text-lg italic text-foreground/90">
              Have you read it before?
            </span>
            <div className="flex gap-3">
              <ChoiceButton
                selected={!data.hasRead}
                onClick={() => setField("hasRead", false)}
                label="No, reading it now"
                hint="we'll hide anything past your chapter"
              />
              <ChoiceButton
                selected={data.hasRead}
                onClick={() => setField("hasRead", true)}
                label="Yes, I've read it"
                hint="see everything, no spoiler worries"
              />
            </div>
          </div>

          {/* Întrebarea 2: la ce capitol ești? */}
          <div>
            <label className="block">
              <span className="mb-2 block text-center font-serif text-lg italic text-foreground/90">
                What chapter are you on?
              </span>
              <input
                type="text"
                inputMode="numeric"
                value={data.currentChapter}
                onChange={(e) => setField("currentChapter", e.target.value)}
                placeholder="8"
                className="mx-auto block w-24 border-b border-muted-foreground/40 bg-transparent pb-2 text-center font-serif text-3xl italic text-foreground transition-colors placeholder:text-muted-foreground/40 focus:border-primary focus:outline-none"
              />
            </label>
            {data.totalChapters.trim() !== "" && (
              <p className="mt-3 text-center text-xs italic text-muted-foreground">
                of {data.totalChapters} chapters
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Navigare: înapoi + înainte */}
      <div className="flex justify-between p-8">
        <button
          onClick={() => router.push("/onboarding/title")}
          className="rounded border border-border px-6 py-3 font-serif italic text-foreground/80 transition-colors hover:bg-secondary/50"
        >
          &larr; back
        </button>
        <button
          onClick={() => router.push("/onboarding/characters")}
          className="rounded bg-primary px-6 py-3 font-serif italic text-primary-foreground transition-colors hover:bg-primary/90"
        >
          continue &rarr;
        </button>
      </div>
    </div>
  )
}

/** Un buton de tip „pastilă" pentru alegerea Da/Nu, cu un mic indiciu dedesubt. */
function ChoiceButton({
  selected,
  onClick,
  label,
  hint,
}: {
  selected: boolean
  onClick: () => void
  label: string
  hint: string
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 rounded border px-4 py-4 text-left transition-colors ${
        selected
          ? "border-primary bg-primary/10"
          : "border-border hover:border-muted-foreground/60"
      }`}
    >
      <span
        className={`block font-serif text-base italic ${
          selected ? "text-primary" : "text-foreground/90"
        }`}
      >
        {label}
      </span>
      <span className="mt-1 block text-xs leading-snug text-muted-foreground">{hint}</span>
    </button>
  )
}
