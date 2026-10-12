/**
 * image-generation.ts — caută imaginile personajelor ÎN FUNDAL și le salvează.
 *
 * Apelat de board (CollageBoard) după onboarding. Rulează O SINGURĂ DATĂ per
 * carte, indiferent de câte ori se remontează componenta (guard la nivel de
 * MODUL, nu de stare React — așa supraviețuiește și la double-invoke-ul din
 * React strict mode în dev).
 *
 * Decuplare intenționată: funcția nu atinge starea React. Board-ul doar
 * interoghează `isGeneratingImages` și reîmprospătează fragmentele din DB pe
 * măsură ce apar. Astfel orice instanță montată a board-ului vede progresul,
 * chiar dacă altă instanță a pornit munca.
 */

import { createFragment } from "@/hooks/use-tessera-data"
import { supabase } from "@/lib/supabase/client"
import type { PendingImageWork } from "@/lib/pending-images"
import type { Fragment } from "@/types"

/**
 * Câte personaje trimitem într-o singură cerere.
 *
 * 3 e compromisul: de 3× mai puține drumuri dus-întors decât varianta „unul
 * câte unul", dar imaginile tot apar în VALURI (board-ul se umple progresiv,
 * nu dintr-o dată după ce s-a terminat totul). Serverul are maxDuration = 60s,
 * iar un grup de 3 personaje × 2 query-uri = 6 căutări, toate paralele acolo —
 * încape confortabil.
 */
const CHARACTERS_PER_REQUEST = 3

/** Taie o listă în bucăți de cel mult `size` elemente. */
function chunk<T>(items: T[], size: number): T[][] {
  const groups: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    groups.push(items.slice(i, i + size))
  }
  return groups
}

/** Cărți pentru care am pornit deja generarea (ca să n-o pornim de două ori). */
const started = new Set<string>()
/** Cărți pentru care generarea e ÎN CURS (board-ul arată indicatorul cât e aici). */
const active = new Set<string>()

/** True cât timp se mai caută imagini pentru cartea dată. */
export function isGeneratingImages(bookId: string): boolean {
  return active.has(bookId)
}

/**
 * Pornește căutarea imaginilor (fire-and-forget). Procesăm PE PERSONAJ, ca
 * imaginile să apară în valuri, nu toate deodată după 30s.
 */
export function startImageGeneration(bookId: string, work: PendingImageWork): void {
  if (started.has(bookId)) return // deja pornită — nu dublăm
  started.add(bookId)
  active.add(bookId)

  void (async () => {
    // Pozițiile a tot ce am plasat până acum. Le trimitem la fiecare cerere
    // următoare, altfel serverul (care vede un singur personaj o dată) ar pune
    // fiecare primă poză în centru → toate se suprapun. Vezi buildImageFragments.
    const placedPositions: Array<{ x: number; y: number }> = []

    // Pornim de la pozițiile fragmentelor DEJA în DB pentru cartea asta (ex:
    // simbolurile create manual la salvare). Fără asta, prima imagine ar cădea
    // fix în centru, peste simbol. Cu ele, findOptimalPosition le ocolește.
    try {
      const { data: existing } = await supabase
        .from("fragments")
        .select("position")
        .eq("book_id", bookId)
      for (const row of existing ?? []) {
        const p = (row as { position?: { x?: number; y?: number } }).position
        if (p && typeof p.x === "number" && typeof p.y === "number") {
          placedPositions.push({ x: p.x, y: p.y })
        }
      }
    } catch {
      // dacă query-ul pică, continuăm cu lista goală (cel mai rău caz: overlap)
    }

    try {
      // Mergem pe GRUPURI de personaje, nu unul câte unul. Înainte, o carte cu
      // 9 personaje făcea 9 drumuri dus-întors secvențiale către server —
      // principalul motiv pentru care board-ul se umplea în ~30s.
      //
      // De ce grupuri și NU cereri paralele: serverul calculează pozițiile
      // pornind din `existingPositions`, iar noi le acumulăm pe măsură ce
      // primim răspunsuri. Două cereri paralele ar primi aceeași listă și ar
      // așeza fragmentele peste ele. Într-un grup, serverul le plasează
      // secvențial în `buildImageFragments`, deci layout-ul rămâne corect.
      for (const group of chunk(work.characters, CHARACTERS_PER_REQUEST)) {
        try {
          const res = await fetch("/api/generate-fragments", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              bookId,
              characters: group,
              existingPositions: placedPositions,
            }),
          })
          const json = await res.json()
          if (res.ok && Array.isArray(json.fragments)) {
            for (const fragment of json.fragments as Fragment[]) {
              await createFragment(fragment)
              placedPositions.push({ x: fragment.position.x, y: fragment.position.y })
            }
          }
        } catch {
          // un grup a eșuat (rețea / fără rezultate) — continuăm cu restul
        }
      }
    } finally {
      active.delete(bookId) // gata: board-ul va opri indicatorul la următoarea verificare
    }
  })()
}
