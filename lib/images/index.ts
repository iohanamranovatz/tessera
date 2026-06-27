/**
 * index.ts — căutarea FEDERATĂ de imagini.
 *
 * `searchImages(query)` lucrează în două straturi (strategia "Hibrid"):
 *
 *   STRATUL 1 — surse de muzeu (principale), chemate în paralel:
 *     Met, Europeana, Wikimedia, Openverse.
 *     Le combinăm, deduplicăm, filtrăm după rezoluție, amestecăm (round-robin).
 *
 *   STRATUL 2 — Unsplash (FALLBACK), chemat DOAR dacă stratul 1 a găsit prea
 *     puține imagini (sub TOP_N). Util pentru cărți contemporane, unde muzeele
 *     nu acoperă. Așa evităm și constrângerile Unsplash (atribuire, fără cache)
 *     atunci când nu avem nevoie de el.
 */

import type { ImageResult } from "./types"
import { searchMet } from "./met-museum"
import { searchWikimedia } from "./wikimedia"
import { searchEuropeana } from "./europeana"
import { searchOpenverse } from "./openverse"
import { searchUnsplash } from "./unsplash"

export type { ImageResult } from "./types"

/** Lățimea minimă acceptată. Sub asta, imaginea e prea mică pentru un fragment. */
const MIN_WIDTH = 800

/** Câte imagini întoarcem în final. */
const TOP_N = 5

/** Sursele PRINCIPALE (muzee), chemate mereu, în paralel. Ordinea = round-robin. */
const PRIMARY_SOURCES: Array<(query: string) => Promise<ImageResult[]>> = [
  searchMet,
  searchEuropeana,
  searchWikimedia,
  searchOpenverse,
]

/**
 * Caută o imagine și întoarce cele mai bune TOP_N rezultate.
 * Fiecare sursă își înghite propriile erori (întoarce []), deci o sursă picată
 * nu strică tot — primim ce-au găsit celelalte.
 */
export async function searchImages(query: string): Promise<ImageResult[]> {
  // STRATUL 1: sursele de muzeu, în paralel.
  const perSource = await Promise.all(PRIMARY_SOURCES.map((fn) => fn(query)))
  const seen = new Set<string>()
  const primary = rank(perSource.flat(), seen)

  // Dacă muzeele au acoperit, gata — nu mai deranjăm Unsplash.
  if (primary.length >= TOP_N) return primary.slice(0, TOP_N)

  // STRATUL 2 (fallback): completăm cu Unsplash. `seen` are deja URL-urile de mai
  // sus, deci nu duplicăm. Unsplash rămâne MEREU la coada listei (e secundar).
  const unsplash = rank(await searchUnsplash(query), seen)
  return [...primary, ...unsplash].slice(0, TOP_N)
}

/**
 * Curăță o listă de imagini: deduplică (folosind setul `seen` partajat),
 * filtrează cele prea mici, apoi le amestecă round-robin pe sursă.
 *
 * @param images Imaginile brute de procesat.
 * @param seen   Set de URL-uri deja văzute (mutat în loc) — ca stratul 2 să nu
 *               redea ce a apărut deja în stratul 1.
 */
function rank(images: ImageResult[], seen: Set<string>): ImageResult[] {
  const unique = images.filter((img) => {
    if (seen.has(img.url)) return false
    seen.add(img.url)
    return true
  })

  // Filtrăm imaginile prea mici. Dacă nu știm lățimea (ex: Met, Europeana), le
  // PĂSTRĂM (sunt în general de calitate) — tăiem doar când lățimea e sigur < MIN.
  const big = unique.filter((img) => img.width === undefined || img.width >= MIN_WIDTH)

  return interleaveBySource(big)
}

/**
 * Amestecă rezultatele luând pe rând câte una din fiecare sursă (round-robin),
 * păstrând ordinea internă a fiecărei surse. Ex: [met1, wiki1, met2, wiki2, ...].
 */
function interleaveBySource(images: ImageResult[]): ImageResult[] {
  // Grupăm pe sursă, păstrând ordinea în care apar sursele.
  const groups = new Map<string, ImageResult[]>()
  for (const img of images) {
    const list = groups.get(img.source) ?? []
    list.push(img)
    groups.set(img.source, list)
  }

  const queues = [...groups.values()]
  const mixed: ImageResult[] = []
  let added = true
  while (added) {
    added = false
    for (const queue of queues) {
      const next = queue.shift()
      if (next) {
        mixed.push(next)
        added = true
      }
    }
  }
  return mixed
}
