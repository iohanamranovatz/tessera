/**
 * europeana.ts — caută imagini prin Europeana (europeana.eu).
 *
 * Europeana e portalul de patrimoniu cultural al UE: milioane de obiecte din
 * muzee, biblioteci și arhive europene. PERFECT pentru clasici europeni
 * (Dostoievski, Tolstoi, Eliade) — picturi, manuscrise, fotografii de epocă.
 *
 * Necesită o CHEIE API gratuită (fără card):
 *   1. Cont gratuit pe https://pro.europeana.eu/page/get-api
 *   2. Primești cheia pe email.
 *   3. O pui în `.env.local` ca:  EUROPEANA_API_KEY=cheia_ta
 *
 * Dacă cheia lipsește, funcția întoarce pur și simplu [] (nu strică federația —
 * celelalte surse merg mai departe).
 *
 * Notă: rezultatele căutării nu conțin dimensiunile imaginii, ca la Met — deci
 * trec de filtrul de rezoluție (sunt în general scanări de calitate).
 */

import type { ImageResult } from "./types"

const ENDPOINT = "https://api.europeana.eu/record/v2/search.json"

/** Câte rezultate cerem per căutare. */
const ROWS = 10

/**
 * Caută în Europeana și întoarce imagini normalizate.
 * Întoarce `[]` dacă lipsește cheia sau la orice problemă — nu aruncă.
 */
export async function searchEuropeana(query: string): Promise<ImageResult[]> {
  const apiKey = process.env.EUROPEANA_API_KEY
  if (!apiKey) return [] // fără cheie, sărim sursa în liniște

  try {
    const params = new URLSearchParams({
      wskey: apiKey,
      query,
      rows: String(ROWS),
      media: "true", // doar obiecte care AU media
      qf: "TYPE:IMAGE", // ...și anume imagini
      profile: "rich", // metadate mai bogate (autor, an)
    })

    const res = await fetch(`${ENDPOINT}?${params.toString()}`)
    if (!res.ok) return []

    const data = await res.json()
    const items: any[] = data?.items ?? []

    const results: ImageResult[] = []
    for (const it of items) {
      // edmIsShownBy = imaginea în rezoluție mare; edmPreview = thumbnail.
      const full: string | undefined = it.edmIsShownBy?.[0] || it.edmPreview?.[0]
      if (!full) continue

      results.push({
        url: full,
        thumbUrl: it.edmPreview?.[0] || undefined,
        title: first(it.title),
        author: first(it.dcCreator),
        year: first(it.year),
        source: "europeana",
        sourceUrl: it.guid || undefined, // pagina obiectului pe portalul Europeana
      })
    }
    return results
  } catch {
    return []
  }
}

/** Europeana întoarce multe câmpuri ca array-uri; luăm primul element util. */
function first(value?: string[]): string | undefined {
  const v = value?.[0]?.trim()
  return v || undefined
}
