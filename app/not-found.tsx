/**
 * 404 — afișată de Next.js când utilizatorul ajunge la o rută inexistentă.
 *
 * Ton dark academia: scurt, cu o ghicitoare în loc de "Page Not Found" sec.
 * Linkul îl trimite înapoi la /library (homepage redirectează acolo oricum
 * dacă există cărți).
 */

import Link from "next/link"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Lost in the library — Tessera",
}

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center font-serif">
      <p className="mb-4 text-xs uppercase tracking-[0.3em] text-muted-foreground">
        404
      </p>
      <h1 className="mb-6 text-4xl italic text-foreground sm:text-5xl">
        Lost in the library.
      </h1>
      <p className="mb-12 max-w-md text-base italic leading-relaxed text-muted-foreground">
        The page you're looking for has slipped between the shelves, or perhaps
        it was never bound to begin with.
      </p>
      <Link
        href="/library"
        className="rounded border border-border px-6 py-3 text-sm italic text-foreground/90 transition-colors hover:bg-secondary/50"
      >
        ← back to your library
      </Link>
    </main>
  )
}
