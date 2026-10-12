"use client"

/**
 * FloatingFragments — stratul decorativ al landing-ului: un colaj de „tesserae"
 * care plutesc lent în spatele titlului.
 *
 * E o previzualizare onestă a produsului: exact tipurile de fragmente care
 * ajung pe board (portret, loc, obiect, citat), în paleta personajelor.
 *
 * DOUĂ DECIZII care contează:
 *
 *  1. ZERO IMAGINI. Fiecare card e SVG inline sau text. Landing-ul nu face
 *     nicio cerere de rețea pentru grafică, deci se pictează instant — ar fi
 *     absurd să livrăm un hero lent exact în timp ce reparăm latența imaginilor.
 *
 *  2. PARALLAX FĂRĂ STATE REACT. Mișcarea de mouse scrie două variabile CSS
 *     (--px, --py) pe elementul rădăcină, într-un requestAnimationFrame. CSS-ul
 *     le consumă (vezi .landing-parallax în globals.css). Nu există setState,
 *     deci nici re-render la fiecare pixel de mouse.
 *
 * Tot stratul e `aria-hidden`: e pură decorație, nu conținut.
 */

import { useEffect, useRef } from "react"

/** Cât de departe de centru poate ajunge parallax-ul, ca factor pe --depth. */
const PARALLAX_DEPTHS = [1.6, 1.2, 0.8, 0.5, 1.4, 0.7, 1.1, 0.9, 1.3]

/** Un fragment din compoziție. */
interface FloatingFragment {
  /** Poziție în procente din hero (top/left), ca să scaleze cu viewport-ul. */
  top: string
  left: string
  /** Lățimea cardului. */
  size: string
  /** Rotația de bază, în grade (CSS o citește ca --rot). */
  rotate: number
  /** Care dintre cele trei derive folosește (b/c suprascriu durata). */
  drift?: "b" | "c"
  /** Culoarea de accent — un token --glow-* din paleta personajelor. */
  color: string
  /** Întârzierea intrării, ca fragmentele să apară pe rând. */
  delay: string
  /** Pe mobil păstrăm doar cele 5 „de bază"; restul se ascund sub sm. */
  mobile?: boolean
  /** Ce desenăm în interior. */
  art: "portrait" | "place" | "object" | "quote" | "symbol"
  /** Textul pentru cardurile de tip quote/symbol, și eticheta de sub celelalte. */
  text?: string
}

/**
 * Compoziția. Pozițiile sunt alese manual ca să lase centrul liber pentru
 * titlu (nimic între 30% și 68% pe verticală în zona centrală) și să nu se
 * suprapună între ele.
 */
const FRAGMENTS: FloatingFragment[] = [
  { top: "8%",  left: "6%",  size: "7.5rem", rotate: -7, color: "var(--glow-dmitri)",  delay: "120ms", mobile: true,  art: "portrait", text: "Dmitri" },
  { top: "14%", left: "78%", size: "8.5rem", rotate: 5,  color: "var(--glow-ivan)",    delay: "260ms", mobile: true,  art: "place",    text: "Skotoprigonyevsk", drift: "b" },
  { top: "60%", left: "4%",  size: "9rem",   rotate: 4,  color: "var(--glow-alyosha)", delay: "400ms", mobile: true,  art: "quote",    text: "I want to suffer and be purified by suffering.", drift: "c" },
  { top: "68%", left: "80%", size: "7rem",   rotate: -5, color: "var(--glow-fyodor)",  delay: "540ms", mobile: true,  art: "object",   text: "three thousand roubles" },
  { top: "34%", left: "87%", size: "5.5rem", rotate: 8,  color: "var(--glow-alyosha)", delay: "680ms", mobile: true,  art: "symbol",   text: "∞", drift: "b" },

  { top: "4%",  left: "40%", size: "6rem",   rotate: 6,  color: "var(--glow-ivan)",    delay: "800ms", art: "object",   text: "the inquisitor" },
  { top: "40%", left: "2%",  size: "5rem",   rotate: -4, color: "var(--glow-fyodor)",  delay: "900ms", art: "symbol",   text: "†", drift: "c" },
  { top: "70%", left: "23%", size: "6rem",   rotate: -6, color: "var(--glow-ivan)",    delay: "1000ms", art: "portrait", text: "Ivan", drift: "b" },
  { top: "7%",  left: "60%", size: "5.5rem", rotate: 7,  color: "var(--glow-dmitri)",  delay: "1100ms", art: "place",    text: "the monastery", drift: "c" },
]

export function FloatingFragments() {
  const rootRef = useRef<HTMLDivElement>(null)

  // Parallax: traducem poziția mouse-ului în --px/--py pe rădăcină.
  useEffect(() => {
    const root = rootRef.current
    if (!root) return

    // Cine a cerut mai puțină mișcare nu primește nici parallax (CSS-ul
    // oricum îl neutralizează, dar așa nu mai ascultăm degeaba evenimente).
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)")
    if (reduced.matches) return

    let frame = 0
    // Ultima poziție citită; o aplicăm o singură dată per cadru de randare.
    let pending: { x: number; y: number } | null = null

    function onPointerMove(event: PointerEvent) {
      // Normalizăm la [-1, 1] față de centrul ferestrei.
      pending = {
        x: (event.clientX / window.innerWidth) * 2 - 1,
        y: (event.clientY / window.innerHeight) * 2 - 1,
      }
      // Dacă avem deja un cadru programat, nu mai cerem altul (throttle).
      if (frame) return
      frame = requestAnimationFrame(() => {
        frame = 0
        if (!pending || !root) return
        root.style.setProperty("--px", String(pending.x))
        root.style.setProperty("--py", String(pending.y))
      })
    }

    window.addEventListener("pointermove", onPointerMove, { passive: true })
    return () => {
      window.removeEventListener("pointermove", onPointerMove)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [])

  return (
    <div
      ref={rootRef}
      aria-hidden
      data-testid="landing-fragments"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {FRAGMENTS.map((fragment, i) => (
        <div
          key={i}
          className={[
            "landing-fragment landing-enter",
            fragment.drift === "b" ? "landing-drift-b" : "",
            fragment.drift === "c" ? "landing-drift-c" : "",
            // Pe ecrane înguste păstrăm doar fragmentele „de bază" — altfel
            // compoziția se îngrămădește peste titlu la ~375px.
            fragment.mobile ? "" : "hidden sm:block",
          ]
            .filter(Boolean)
            .join(" ")}
          style={{
            top: fragment.top,
            left: fragment.left,
            // Lățimea o dăm ca variabilă, NU ca `width`: CSS-ul o scalează pe
            // ecrane înguste (vezi .landing-fragment în globals.css). Mărimile
            // sunt în rem, deci pe un telefon de 375px un card de 7.5rem ar
            // acoperi o treime din lățime și ar călca peste titlu.
            ["--w" as string]: fragment.size,
            // Rotația de bază + adâncimea de parallax, citite din CSS.
            ["--rot" as string]: `${fragment.rotate}deg`,
            ["--depth" as string]: String(PARALLAX_DEPTHS[i] ?? 1),
            animationDelay: fragment.delay,
          }}
        >
          <div className="landing-parallax">
            <FragmentCard fragment={fragment} />
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Un card de fragment: ramă „polaroid" (clasa existentă din globals.css) cu
 * un halou în culoarea personajului și un desen SVG înăuntru.
 */
function FragmentCard({ fragment }: { fragment: FloatingFragment }) {
  const { color, art, text } = fragment

  return (
    <div
      className="polaroid rounded-sm"
      style={{
        // Haloul colorat îl punem inline (culoarea variază per fragment, deci
        // nu poate fi o clasă statică) peste umbra de bază a polaroidului.
        boxShadow: `0 0 36px -6px ${color}, 0 6px 18px rgba(0,0,0,0.5)`,
      }}
    >
      <div
        className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-sm"
        style={{ background: `color-mix(in srgb, ${color} 30%, #1a1410)` }}
      >
        <FragmentArt art={art} color={color} text={text} />
      </div>
      {/* Eticheta de sub imagine, pe banda albă a polaroidului.
          Sărim „quote" și „symbol": la ele `text` E deja conținutul cardului,
          deci o etichetă ar repeta același lucru de două ori. */}
      {art !== "quote" && art !== "symbol" && text && (
        <p className="truncate px-0.5 pt-1.5 text-center font-serif text-[0.5rem] italic text-[#3a2818]">
          {text}
        </p>
      )}
    </div>
  )
}

/** Desenul din interiorul unui card — aceleași glife ca pe board-ul real. */
function FragmentArt({
  art,
  color,
  text,
}: {
  art: FloatingFragment["art"]
  color: string
  text?: string
}) {
  switch (art) {
    // Portret: cerc + umeri, ca placeholder-ul „human" din FragmentContent.
    case "portrait":
      return (
        <svg viewBox="0 0 100 100" className="h-3/5 w-3/5">
          <circle cx="50" cy="38" r="18" fill={color} opacity="0.9" />
          <path d="M20 90 Q50 55 80 90 Z" fill={color} opacity="0.9" />
        </svg>
      )

    // Loc: linia orizontului, ca placeholder-ul „place".
    case "place":
      return (
        <svg viewBox="0 0 100 60" className="h-1/2 w-3/5">
          <path d="M5 50 L35 20 L55 40 L75 15 L95 50 Z" fill={color} opacity="0.85" />
          <line x1="0" y1="50" x2="100" y2="50" stroke={color} strokeWidth="2.5" />
        </svg>
      )

    // Obiect: cadru cu un punct în mijloc, ca placeholder-ul „object".
    case "object":
      return (
        <svg viewBox="0 0 100 100" className="h-1/2 w-1/2">
          <rect x="20" y="20" width="60" height="60" rx="4" fill="none" stroke={color} strokeWidth="5" />
          <circle cx="50" cy="50" r="10" fill={color} opacity="0.9" />
        </svg>
      )

    // Simbol: un singur glif, mare.
    case "symbol":
      return (
        <span className="font-serif text-3xl leading-none" style={{ color }}>
          {text}
        </span>
      )

    // Citat: textul însuși e conținutul cardului.
    case "quote":
    default:
      return (
        <p className="px-2 text-center font-serif text-[0.55rem] italic leading-snug text-[#e8dcc4]">
          “{text}”
        </p>
      )
  }
}
