/**
 * character-fragments.ts — transformă query-urile vizuale ale AI-ului în fragmente
 * reale, cu imagini, gata de pus pe board.
 *
 * Flux: AI-ul a dat fiecărui personaj 2-3 `imageQueries` (vezi book-ai.ts).
 * Pentru fiecare query chemăm `searchImages` (căutarea federată) și luăm prima
 * imagine găsită. Construim un `Fragment` cu URL-ul ei în `content`.
 *
 * RULEAZĂ PE SERVER (cheamă searchImages, care folosește chei API). Nu importa
 * din componente "use client".
 */

import type { Fragment, FragmentSize } from "@/types"
import { searchImages } from "@/lib/images"
import { findOptimalPosition } from "@/lib/positioning"

/** Câte query-uri folosim per personaj (chiar dacă AI-ul dă mai multe).
 *  2 = board echilibrat + onboarding mai rapid (fiecare query e o căutare de rețea). */
const MAX_QUERIES_PER_CHARACTER = 2

/** Mărimile posibile ale unui fragment; rotăm prin ele pentru varietate vizuală. */
const SIZES: FragmentSize[] = ["small", "medium", "large"]

/** Personaj minimal de care avem nevoie aici: id-ul (deja generat) + query-urile. */
export interface CharacterForFragments {
  /** Id-ul personajului DEJA salvat (fragmentele se leagă de el prin character_id). */
  id: string
  imageQueries: string[]
}

/**
 * Construiește fragmente cu imagini pentru o listă de personaje.
 * Întoarce un array de `Fragment` (cu id-uri noi) — apelantul le salvează în DB.
 *
 * Pozițiile sunt calculate cu `findOptimalPosition`, ca fragmentele să nu se
 * suprapună. Rotația variază ușor, ca într-un colaj de manuscris.
 */
export async function buildImageFragments(
  characters: CharacterForFragments[],
  bookId: string,
): Promise<Fragment[]> {
  const fragments: Fragment[] = []
  let placed = 0 // câte am pus până acum (pentru a varia mărimea/rotația)

  for (const character of characters) {
    const queries = character.imageQueries.slice(0, MAX_QUERIES_PER_CHARACTER)

    for (const query of queries) {
      const results = await searchImages(query)
      const top = results[0]
      if (!top) continue // niciun rezultat pentru acest query — sărim

      // Poziție cât mai departe de fragmentele deja puse + o rotație ușoară.
      const { x, y } = findOptimalPosition(fragments)
      const rotation = ((placed % 2 === 0 ? 1 : -1) * (3 + (placed % 5))) // -7..+7 grade

      fragments.push({
        id: crypto.randomUUID(),
        bookId,
        characterId: character.id,
        // Fragment-ele „object" sunt cele gândite să poarte imagini (vezi types/).
        type: "object",
        content: top.url, // URL-ul imaginii — UI-ul randează <img> când content e URL
        label: top.title || query, // titlul operei, altfel query-ul ca etichetă
        position: { x, y, rotation },
        size: SIZES[placed % SIZES.length],
        // Persistăm metadata sursei: avem nevoie de ea la fiecare afișare
        // pentru atribuire (Unsplash) și tracking. Vezi STAGIUL 7.5.B.
        imageMeta: {
          source: top.source,
          license: top.license,
          author: top.author,
          authorUrl: top.authorUrl,
          sourceUrl: top.sourceUrl,
          requiresAttribution: top.requiresAttribution,
          downloadLocation: top.downloadLocation,
        },
      })
      placed++
    }
  }

  return fragments
}
