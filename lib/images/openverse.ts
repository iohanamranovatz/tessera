/**
 * openverse.ts — caută imagini prin Openverse (openverse.org).
 *
 * Openverse e un agregator de media cu licențe libere (CC + domeniu public) din
 * multe surse (Flickr, muzee, Wikimedia etc.). Ne dă direct URL-ul, dimensiunile
 * și autorul — deci filtrul de rezoluție funcționează curat.
 *
 * SURSĂ OPȚIONALĂ, dezactivată implicit. Accesul anonim NU mai merge: măsurat,
 * API-ul răspunde cu HTTP 429 la FIECARE cerere (iar un curl direct primește
 * pagina de verificare Cloudflare, nu JSON). Cât timp o chemam oricum, fiecare
 * căutare irosea un drum de rețea garantat eșuat și umplea log-ul de avertismente.
 *
 * Ca s-o activezi, înregistrează o aplicație (https://api.openverse.org/v1/auth_tokens/register/),
 * obține un token și pune-l în `.env.local`:  OPENVERSE_API_TOKEN=token_ul_tau
 * Fără el, funcția întoarce [] în liniște — exact ca Europeana/Unsplash fără cheie.
 *
 * LICENȚE (vezi STAGIUL 7.5):
 * Implicit Openverse întoarce TOT — inclusiv CC BY-SA, care ne-ar obliga la
 * open source. Cerem server-side `license_type=public_domain` (= PDM + CC0)
 * și verificăm și pe client câmpul `license` ca plasă de siguranță.
 */

import type { ImageResult, License } from "./types"
import { fetchJson } from "./http"

const ENDPOINT = "https://api.openverse.org/v1/images/"

/** Câte rezultate cerem per căutare. O singură cerere, deci mărimea paginii
 *  nu schimbă latența. */
const PAGE_SIZE = 10

/** `license_type=public_domain` ⇒ doar PDM/CC0, deci cacheabil. */
const REVALIDATE_SECONDS = 86_400

/**
 * Caută în Openverse și întoarce imagini normalizate.
 * Întoarce `[]` la orice problemă — nu aruncă (vezi nota din met-museum.ts).
 */
export async function searchOpenverse(query: string): Promise<ImageResult[]> {
  const token = process.env.OPENVERSE_API_TOKEN
  if (!token) return [] // fără token, sărim sursa în liniște (vezi nota de sus)

  try {
    const params = new URLSearchParams({
      q: query,
      page_size: String(PAGE_SIZE),
      // `license_type=public_domain` la Openverse înseamnă PDM + CC0 — exact
      // ce vrem. Filtrul e server-side: nu primim deloc CC BY / CC BY-SA.
      license_type: "public_domain",
    })

    const data = await fetchJson<{ results?: any[] }>(`${ENDPOINT}?${params.toString()}`, {
      revalidate: REVALIDATE_SECONDS,
      headers: { Authorization: `Bearer ${token}` },
    })

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
