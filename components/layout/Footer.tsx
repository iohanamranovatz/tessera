/**
 * Footer — subtle, always-visible footer with legal links.
 *
 * Design: dark academia, very low presence. The collage board is the star;
 * the footer is a thin band of italic text at the bottom that fades in only
 * enough to be readable.
 *
 * Lives in the root layout so it's reachable from any page (required by
 * GDPR — privacy policy must be one click away from anywhere).
 */

import Link from "next/link"

export function Footer() {
  return (
    <footer className="mt-auto border-t border-border/60 bg-background/40 py-4 text-center font-serif text-xs italic text-muted-foreground">
      <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
        <span>Tessera — a literary moodboard</span>
        <span aria-hidden>·</span>
        <Link className="hover:text-foreground" href="/privacy">
          Privacy
        </Link>
        <span aria-hidden>·</span>
        <Link className="hover:text-foreground" href="/terms">
          Terms
        </Link>
      </nav>
    </footer>
  )
}
