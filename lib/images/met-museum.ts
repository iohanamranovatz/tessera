/**
 * met-museum.ts — caută imagini în colecția Metropolitan Museum of Art.
 *
 * API public, GRATIS, fără cheie: https://metmuseum.github.io/
 * Met are DOUĂ categorii de obiecte:
 *   - „Open Access" (obj.isPublicDomain === true) → domeniu public, le putem
 *     afișa, cacha și redistribui liber.
 *   - Restul → drepturi rezervate, NU avem voie să le folosim public.
 * Filtrăm strict pe `isPublicDomain === true` (vezi STAGIUL 7.5).
 *
 * Cum merge API-ul (în 2 pași):
 *   1. /v1.1/search?q=...  → listă de ID-uri de obiecte.
 *      ATENȚIE: endpoint-ul vechi /v1/search a fost RETRAS pe 2026-10-01 (întorcea
 *      toate ID-urile dintr-o dată, prin Solr). Înlocuitorul e /v1.1/search, bazat
 *      pe Elastic și PAGINAT prin `limit`/`offset` — de aceea trimitem `limit`.
 *      Cât timp am rămas pe v1, sursa asta întorcea tăcut [] la ORICE căutare.
 *   2. /objects/{id}  → detaliile unui obiect (inclusiv URL-ul imaginii + isPublicDomain).
 * Deci pentru fiecare imagine e nevoie de încă un apel. Ca să nu abuzăm, luăm doar
 * primele câteva ID-uri și le cerem detaliile în paralel.
 */

import type { ImageResult } from "./types"
import { fetchJson } from "./http"

const SEARCH_URL = "https://collectionapi.metmuseum.org/public/collection/v1.1/search"
const OBJECT_URL = "https://collectionapi.metmuseum.org/public/collection/v1/objects"

/** Câte obiecte detaliem per căutare. Cererile de detaliu merg TOATE în
 *  paralel, deci numărul lor aproape nu schimbă latența (tot un singur val de
 *  așteptare) — schimbă doar câte șanse avem să nimerim un obiect din domeniul
 *  public. Scăzusem la 3 „pentru viteză": câștig neglijabil, dar jumătate din
 *  randament. 6 e valoarea potrivită. */
const MAX_OBJECTS = 6

/** Câte ID-uri cerem de la căutare. Mai multe decât detaliem, fiindcă multe
 *  obiecte pică la filtrul `isPublicDomain` și vrem rezervă. */
const SEARCH_LIMIT = 12

/** Câte detalii cerem odată. Mic, ca oprirea devreme să chiar economisească. */
const DETAIL_BATCH = 2

/** Câte rezultate bune ne ajung ca să ne oprim din cerut detalii.
 *  Apelantul real (searchFirstImage) folosește unul singur; 2 lasă o rezervă
 *  dacă primul pică la filtrul de lățime din index.ts. */
const ENOUGH_RESULTS = 2

/** Met e open access și în domeniu public — îl putem cache-ui liniștit.
 *  O zi: colecția nu se schimbă de la o oră la alta. */
const REVALIDATE_SECONDS = 86_400

/**
 * Caută în Met Museum și întoarce imagini normalizate.
 * Întoarce `[]` la orice problemă (rețea, fără rezultate) — nu aruncă, ca să nu
 * dărâme căutarea federată dacă o singură sursă pică.
 */
export async function searchMet(query: string): Promise<ImageResult[]> {
  try {
    // Pasul 1: căutăm doar obiecte CARE AU imagine (hasImages=true).
    const params = new URLSearchParams({ q: query, hasImages: "true", limit: String(SEARCH_LIMIT) })
    const data = await fetchJson<{ objectIDs?: number[] }>(
      `${SEARCH_URL}?${params.toString()}`,
      { revalidate: REVALIDATE_SECONDS },
    )

    const ids: number[] = data?.objectIDs ?? []
    if (ids.length === 0) return []

    // Pasul 2: cerem detaliile PE VALURI MICI, cu oprire devreme.
    //
    // Varianta „toate MAX_OBJECTS deodată" cerea 6 detalii de fiecare dată,
    // adică 7 drumuri per căutare. Înmulțit cu zeci de căutări, Met devenea
    // cea mai scumpă sursă din federație (măsurat: 21s pentru o carte).
    // În practică ne trebuie O SINGURĂ imagine, iar primul obiect returnat e
    // de regulă deja Open Access — deci cerem 2, verificăm, și ne oprim imediat
    // ce avem destul. Cazul obișnuit: 1 + 2 = 3 drumuri în loc de 7.
    const chosen = ids.slice(0, MAX_OBJECTS)
    const results: ImageResult[] = []

    for (let i = 0; i < chosen.length && results.length < ENOUGH_RESULTS; i += DETAIL_BATCH) {
      const objects = await Promise.all(
        chosen
          .slice(i, i + DETAIL_BATCH)
          .map((id) => fetchJson<any>(`${OBJECT_URL}/${id}`, { revalidate: REVALIDATE_SECONDS })),
      )

      // Păstrăm doar obiectele care chiar au o imagine principală ȘI sunt în
      // domeniul public (isPublicDomain === true). Orice altceva ne-ar expune
      // la încălcare de drepturi de autor — vezi STAGIUL 7.5.
      for (const obj of objects) {
        if (!obj?.primaryImage) continue // unele „au imagini" dar nu una principală
        if (obj.isPublicDomain !== true) continue // filtru strict: doar Open Access
        results.push({
          url: obj.primaryImage, // Met dă imagini de rezoluție mare; nu avem px exacți.
          thumbUrl: obj.primaryImageSmall || undefined,
          title: obj.title || undefined,
          author: obj.artistDisplayName || undefined,
          year: obj.objectDate || undefined,
          source: "met",
          sourceUrl: obj.objectURL || undefined,
          license: "public-domain",
          requiresAttribution: false,
        })
      }
    }
    return results
  } catch {
    return []
  }
}
