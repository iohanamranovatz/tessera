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
 */

import type { ImageResult } from "./types"

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
    })

    const res = await fetch(`${ENDPOINT}?${params.toString()}`, {
      headers: { "User-Agent": "Tessera/0.1 (literary moodboard; educational project)" },
    })
    if (!res.ok) return []

    const data = await res.json()
    const items: any[] = data?.results ?? []

    return items
      .filter((it) => it?.url) // trebuie să aibă URL de imagine
      .map((it) => ({
        url: it.url,
        thumbUrl: it.thumbnail || undefined,
        width: it.width || undefined,
        height: it.height || undefined,
        title: it.title || undefined,
        author: it.creator || undefined,
        source: "openverse" as const,
        sourceUrl: it.foreign_landing_url || undefined,
      }))
  } catch {
    return []
  }
}
