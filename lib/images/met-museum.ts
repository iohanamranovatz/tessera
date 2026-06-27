/**
 * met-museum.ts — caută imagini în colecția Metropolitan Museum of Art.
 *
 * API public, GRATIS, fără cheie: https://metmuseum.github.io/
 * Imaginile sunt din domeniul public (open access) — le putem afișa și cacha liber,
 * fără atribuire obligatorie pe ecran. Perfect pentru estetica dark academia
 * (picturi, obiecte, portrete din secolele trecute).
 *
 * Cum merge API-ul (în 2 pași):
 *   1. /search?q=...  → ne dă o listă de ID-uri de obiecte (poate fi foarte lungă).
 *   2. /objects/{id}  → detaliile unui obiect (inclusiv URL-ul imaginii).
 * Deci pentru fiecare imagine e nevoie de încă un apel. Ca să nu abuzăm, luăm doar
 * primele câteva ID-uri și le cerem detaliile în paralel.
 */

import type { ImageResult } from "./types"

const SEARCH_URL = "https://collectionapi.metmuseum.org/public/collection/v1/search"
const OBJECT_URL = "https://collectionapi.metmuseum.org/public/collection/v1/objects"

/** Câte obiecte detaliem per căutare. Mic, ca să nu facem zeci de apeluri. */
const MAX_OBJECTS = 6

/**
 * Caută în Met Museum și întoarce imagini normalizate.
 * Întoarce `[]` la orice problemă (rețea, fără rezultate) — nu aruncă, ca să nu
 * dărâme căutarea federată dacă o singură sursă pică.
 */
export async function searchMet(query: string): Promise<ImageResult[]> {
  try {
    // Pasul 1: căutăm doar obiecte CARE AU imagine (hasImages=true).
    const params = new URLSearchParams({ q: query, hasImages: "true" })
    const res = await fetch(`${SEARCH_URL}?${params.toString()}`)
    if (!res.ok) return []

    const data = await res.json()
    const ids: number[] = data?.objectIDs ?? []
    if (ids.length === 0) return []

    // Pasul 2: luăm primele MAX_OBJECTS ID-uri și le cerem detaliile în paralel.
    const chosen = ids.slice(0, MAX_OBJECTS)
    const objects = await Promise.all(
      chosen.map(async (id) => {
        const r = await fetch(`${OBJECT_URL}/${id}`)
        return r.ok ? r.json() : null
      }),
    )

    // Păstrăm doar obiectele care chiar au o imagine principală și le normalizăm.
    const results: ImageResult[] = []
    for (const obj of objects) {
      if (!obj?.primaryImage) continue // unele „au imagini" dar nu una principală
      results.push({
        url: obj.primaryImage, // Met dă imagini de rezoluție mare; nu avem px exacți.
        thumbUrl: obj.primaryImageSmall || undefined,
        title: obj.title || undefined,
        author: obj.artistDisplayName || undefined,
        year: obj.objectDate || undefined,
        source: "met",
        sourceUrl: obj.objectURL || undefined,
      })
    }
    return results
  } catch {
    return []
  }
}
