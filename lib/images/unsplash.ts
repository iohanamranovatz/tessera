/**
 * unsplash.ts — caută fotografii pe Unsplash (unsplash.com).
 *
 * ROL ÎN TESSERA: e DOAR FALLBACK (vezi index.ts). Sursele de muzeu (Met,
 * Europeana, Wikimedia, Openverse) sunt principale; Unsplash intră doar când
 * acelea găsesc prea puține imagini — util pentru cărți CONTEMPORANE, unde
 * colecțiile de muzeu nu acoperă.
 *
 * Necesită o CHEIE gratuită (cont developer):
 *   1. Cont pe https://unsplash.com/developers → "New Application"
 *   2. Iei "Access Key" și o pui în `.env.local`:  UNSPLASH_ACCESS_KEY=cheia_ta
 * Fără cheie, funcția întoarce [] (fallback-ul pur și simplu nu aduce nimic).
 *
 * REGULI UNSPLASH (obligatorii, altfel îți pot bloca aplicația):
 *   - ATRIBUIRE pe ecran: numele fotografului + link, cu parametri UTM.
 *     De aceea marcăm rezultatele cu `requiresAttribution: true`.
 *   - HOTLINKING: afișăm direct URL-ul de la Unsplash; NU cachem imaginea pe
 *     server. (Restul surselor pot fi cache-uite; Unsplash nu.)
 *   - La folosirea reală a unei poze trebuie „pinguit" endpoint-ul de download
 *     (links.download_location). Asta o facem la 6.C.4, când chiar alegem poza.
 */

import type { ImageResult } from "./types"

const ENDPOINT = "https://api.unsplash.com/search/photos"

/** Numele aplicației, cerut în parametrii UTM ai link-urilor de atribuire. */
const APP_NAME = "Tessera"

/** Câte rezultate cerem per căutare. */
const PER_PAGE = 10

/** Adaugă parametrii UTM ceruți de Unsplash pe link-urile de atribuire. */
function withUtm(url: string): string {
  const sep = url.includes("?") ? "&" : "?"
  return `${url}${sep}utm_source=${APP_NAME}&utm_medium=referral`
}

/**
 * Caută pe Unsplash și întoarce fotografii normalizate.
 * Întoarce `[]` dacă lipsește cheia sau la orice problemă — nu aruncă.
 */
export async function searchUnsplash(query: string): Promise<ImageResult[]> {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY
  if (!accessKey) return [] // fără cheie, fallback-ul nu aduce nimic

  try {
    const params = new URLSearchParams({
      query,
      per_page: String(PER_PAGE),
    })

    const res = await fetch(`${ENDPOINT}?${params.toString()}`, {
      headers: {
        // Unsplash cere cheia ca "Client-ID <access_key>".
        Authorization: `Client-ID ${accessKey}`,
      },
    })
    if (!res.ok) return []

    const data = await res.json()
    const items: any[] = data?.results ?? []

    return items
      .filter((it) => it?.urls?.regular)
      .map((it) => ({
        url: it.urls.regular, // ~1080px; hotlink direct, fără cache
        thumbUrl: it.urls.small || undefined,
        width: it.width || undefined,
        height: it.height || undefined,
        title: it.description || it.alt_description || undefined,
        author: it.user?.name || undefined,
        authorUrl: it.user?.links?.html ? withUtm(it.user.links.html) : undefined,
        source: "unsplash" as const,
        sourceUrl: it.links?.html ? withUtm(it.links.html) : undefined,
        requiresAttribution: true, // Unsplash OBLIGĂ atribuirea pe ecran
      }))
  } catch {
    return []
  }
}
