"use client"

/**
 * ImageAttribution — linia de credit pentru imaginile care O cer (Unsplash).
 *
 * Reguli (vezi STAGIUL 7.5.B):
 *   - Pentru imagini fără `requiresAttribution`: nu randăm NIMIC.
 *   - Pentru Unsplash: „Photo by [Nume] on Unsplash" cu link către profilul
 *     fotografului și către pagina Unsplash a fotografiei. Ambele link-uri
 *     trebuie să poarte parametrii UTM (deja adăugați în lib/images/unsplash.ts).
 *
 * Design:
 *   - Invizibil în mod normal (opacity-0) ca să nu strice estetica dark academia.
 *   - Apare la hover pe părintele care are clasa `group` (Fragment.tsx) —
 *     atunci primește opacity-100, prin clasa `group-hover:`.
 *   - Font Georgia (serif) italic, 10px, opacity 60%, peste un fundal dark
 *     semi-transparent pentru lizibilitate.
 *   - Poziționat absolut în colțul din dreapta jos al containerului-părinte
 *     (părintele trebuie să fie `relative`).
 */

import type { FragmentImageMeta } from "@/types"

interface ImageAttributionProps {
  meta?: FragmentImageMeta
}

export function ImageAttribution({ meta }: ImageAttributionProps) {
  // Fără metadata sau fără cerință de atribuire → nu randăm nimic.
  if (!meta?.requiresAttribution) return null

  // Sursa Unsplash e singura pe care o tratăm acum. Dacă în viitor mai
  // adăugăm surse cu atribuire obligatorie, le tratăm cu un switch aici.
  if (meta.source !== "unsplash") return null

  const author = meta.author ?? "Unknown"
  const authorHref = meta.authorUrl
  const sourceHref = meta.sourceUrl

  return (
    <div
      className="pointer-events-none absolute bottom-1 right-1 z-20 rounded-sm bg-black/55 px-1.5 py-0.5 opacity-0 transition-opacity duration-200 group-hover:pointer-events-auto group-hover:opacity-100"
      style={{
        // Cerințele exacte din prompt: Georgia italic, 10px, opacity 0.6.
        // Opacity-ul pe TEXT (separat de opacity-ul containerului de mai sus,
        // care e doar pentru hover-toggle).
        fontFamily: "Georgia, 'Playfair Display', serif",
        fontStyle: "italic",
        fontSize: "10px",
        lineHeight: 1.2,
        color: "rgba(232, 220, 196, 0.6)", // cream-ul aplicației, la 60%
      }}
    >
      <span>Photo by </span>
      {authorHref ? (
        <a
          href={authorHref}
          target="_blank"
          rel="noopener noreferrer"
          className="underline-offset-2 hover:underline"
        >
          {author}
        </a>
      ) : (
        <span>{author}</span>
      )}
      <span> on </span>
      {sourceHref ? (
        <a
          href={sourceHref}
          target="_blank"
          rel="noopener noreferrer"
          className="underline-offset-2 hover:underline"
        >
          Unsplash
        </a>
      ) : (
        <span>Unsplash</span>
      )}
    </div>
  )
}
