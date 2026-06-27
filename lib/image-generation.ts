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
import type { PendingImageWork } from "@/lib/pending-images"
import type { Fragment } from "@/types"

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
    try {
      for (const character of work.characters) {
        try {
          const res = await fetch("/api/generate-fragments", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ bookId, characters: [character] }),
          })
          const json = await res.json()
          if (res.ok && Array.isArray(json.fragments)) {
            for (const fragment of json.fragments as Fragment[]) {
              await createFragment(fragment)
            }
          }
        } catch {
          // un personaj a eșuat (rețea / fără rezultate) — continuăm cu restul
        }
      }
    } finally {
      active.delete(bookId) // gata: board-ul va opri indicatorul la următoarea verificare
    }
  })()
}
