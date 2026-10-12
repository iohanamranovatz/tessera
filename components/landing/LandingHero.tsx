"use client"

/**
 * LandingHero — ecranul de intrare al Tessera (ruta `/`).
 *
 * Un singur ecran, cinematic: colajul de fragmente plutește în fundal,
 * titlul apare literă cu literă, apoi tagline-ul și butoanele. Nimic de
 * derulat — tot ce trebuie să înțeleagă un vizitator nou încape într-un
 * viewport.
 *
 * De ce NU redirecționăm userul logat spre /library: un redirect ar face
 * pagina să clipească (hero → library) la fiecare vizită. În schimb schimbăm
 * doar butonul principal în „open your library". Cine vine pe `/` a cerut
 * explicit pagina asta.
 *
 * Animațiile sunt CSS pur (vezi blocul „Landing" din globals.css) — fără
 * framer-motion, fără dependențe noi.
 */

import Link from "next/link"
import { useAuth } from "@/context/AuthContext"
import { FloatingFragments } from "./FloatingFragments"

/** Titlul, spart în litere ca să le putem întârzia individual. */
const TITLE = "tessera".split("")

/** Cât întârzie fiecare literă față de cea de dinainte. */
const LETTER_STAGGER_MS = 70

/** Momentul (ms) de la care intră tagline-ul; după ce s-au așezat literele. */
const TAGLINE_DELAY_MS = TITLE.length * LETTER_STAGGER_MS + 250

export function LandingHero() {
  const { user, loading } = useAuth()

  // Cât verificăm sesiunea nu știm încă dacă e „begin" sau „library", așa că
  // ținem varianta pentru vizitator (cazul comun) și o schimbăm când aflăm.
  const signedIn = !loading && user !== null

  return (
    <section
      data-testid="landing-hero"
      className="relative flex h-[100svh] w-full flex-col items-center justify-center overflow-hidden paper-texture"
    >
      {/* 1. Colajul plutitor (decorativ, aria-hidden înăuntru). */}
      <FloatingFragments />

      {/* 2. Vignetă peste colaj: întunecă marginile ca textul să rămână lizibil
             indiferent pe ce cade un fragment. */}
      <div aria-hidden className="landing-vignette pointer-events-none absolute inset-0" />

      {/* 3. Aura care respiră în spatele titlului. */}
      <div
        aria-hidden
        className="landing-aura pointer-events-none absolute h-[22rem] w-[22rem] rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(circle, color-mix(in srgb, var(--primary) 22%, transparent) 0%, transparent 70%)",
        }}
      />

      {/* 4. Conținutul. `relative` ca să stea peste vignetă. */}
      <div className="relative flex flex-col items-center px-6 text-center">
        <h1
          data-testid="landing-title"
          className="font-serif italic tracking-tight text-primary"
          style={{ fontSize: "clamp(3.5rem, 14vw, 9rem)", lineHeight: 1 }}
        >
          {/* Literele intră pe rând. aria-label ține titlul citibil ca un
              singur cuvânt pentru cititoarele de ecran, nu „t-e-s-s-e-r-a". */}
          <span className="sr-only">tessera</span>
          <span aria-hidden>
            {TITLE.map((letter, i) => (
              <span
                key={i}
                className="landing-enter inline-block"
                style={{ animationDelay: `${i * LETTER_STAGGER_MS}ms` }}
              >
                {letter}
              </span>
            ))}
          </span>
        </h1>

        {/* Linie subțire de separare, intră lățindu-se odată cu tagline-ul. */}
        <div
          aria-hidden
          className="landing-enter mt-5 h-px w-24 bg-primary/40"
          style={{ animationDelay: `${TAGLINE_DELAY_MS}ms` }}
        />

        <p
          data-testid="landing-tagline"
          className="landing-enter mt-6 max-w-xl font-serif text-base italic leading-relaxed text-foreground/80 sm:text-lg"
          style={{ animationDelay: `${TAGLINE_DELAY_MS + 120}ms` }}
        >
          A dark-academia moodboard for readers of long novels — characters,
          nicknames, relationships, atmosphere.
        </p>

        <p
          className="landing-enter mt-3 max-w-md font-sans text-xs leading-relaxed text-muted-foreground sm:text-sm"
          style={{ animationDelay: `${TAGLINE_DELAY_MS + 240}ms` }}
        >
          Name a book. Tessera maps everyone in it and builds you a collage of
          real museum artwork — so you never lose track of who “Mitenka” is again.
        </p>

        {/* Butoanele: aceeași rețetă de stil ca în /library, ca aplicația să
            arate dintr-o bucată. */}
        <div
          className="landing-enter mt-10 flex flex-col items-center gap-3 sm:flex-row"
          style={{ animationDelay: `${TAGLINE_DELAY_MS + 360}ms` }}
        >
          <Link
            data-testid="landing-cta-primary"
            href={signedIn ? "/library" : "/signup"}
            className="rounded border border-primary/60 bg-primary/10 px-6 py-2.5 font-serif text-sm italic text-primary transition-colors hover:bg-primary/20"
          >
            {signedIn ? "open your library" : "begin a collage"}
          </Link>
          {/* Cine e deja logat nu are nevoie de „sign in". */}
          {!signedIn && (
            <Link
              data-testid="landing-cta-signin"
              href="/login"
              className="rounded border border-border px-6 py-2.5 font-serif text-sm text-foreground/90 transition-colors hover:bg-secondary/50"
            >
              sign in
            </Link>
          )}
        </div>
      </div>
    </section>
  )
}
