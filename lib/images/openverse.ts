/**
 * openverse.ts — caută imagini prin Openverse (openverse.org).
 *
 * API public, GRATIS, fără cheie obligatorie. Openverse e un agregator de media
 * cu licențe libere (CC + domeniu public) din multe surse (Flickr, muzee,
 * Wikimedia etc.). Ne dă direct URL-ul, dimensiunile și autorul — deci filtrul
 * de rezoluție funcționează curat.
 *
 * Notă: fără cheie există o limită de rată mai mică. E suficient pentru dezvoltare;
 * dacă lovim limita, ne putem înregistra pentru un token (la 6.C.2+ dacă e nevoie).
 *
 * LICENȚE (vezi STAGIUL 7.5):
 * Implicit Openverse întoarce TOT — inclusiv CC BY-SA, care ne-ar obliga la
 * open source. Cerem server-side `license_type=public_domain` (= PDM + CC0)
 * și verificăm și pe client câmpul `license` ca plasă de siguranță.
 */

import type { ImageResult, License } from "./types"

const ENDPOINT = "https://api.openverse.org/v1/images/"

/** Câte rezultate cerem per căutare. */
const PAGE_SIZE = 10

/**
 * Caută în Openverse și întoarce imagini normalizate.
 * Întoarce `[]` la orice problemă — nu aruncă (vezi nota din met-museum.ts).
 */
export async function searchOpenverse(query: string): Promise<ImageResult[]> {
  try {
    const params = new URLSearchParams({
      q: query,
      page_size: String(PAGE_SIZE),
      // `license_type=public_domain` la Openverse înseamnă PDM + CC0 — exact
      // ce vrem. Filtrul e server-side: nu primim deloc CC BY / CC BY-SA.
      license_type: "public_domain",
    })

    const res = await fetch(`${ENDPOINT}?${params.toString()}`, {
      headers: { "User-Agent": "Tessera/0.1 (literary moodboard; educational project)" },
    })
    if (!res.ok) return []

    const data = await res.json()
    const items: any[] = data?.results ?? []

    const results: ImageResult[] = []
    for (const it of items) {
      if (!it?.url) continue
      // Plasă de siguranță pe client: confirmăm că licența chiar e PD/CC0.
      const license = detectLicense(it.license)
      if (!license) continue

      results.push({
        url: it.url,
        thumbUrl: it.thumbnail || undefined,
        width: it.width || undefined,
        height: it.height || undefined,
        title: it.title || undefined,
        author: it.creator || undefined,
        source: "openverse",
        sourceUrl: it.foreign_landing_url || undefined,
        license,
        requiresAttribution: false,
      })
    }
    return results
  } catch {
    return []
  }
}

/** Câmpul `license` din Openverse vine ca slug scurt: „cc0", „pdm", „by-sa"… */
function detectLicense(value?: string): License | null {
  if (!value) return null
  const v = value.toLowerCase()
  if (v === "cc0") return "cc0"
  if (v === "pdm") return "public-domain"
  return null
}
