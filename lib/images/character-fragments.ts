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
import { findOptimalPosition, type Point } from "@/lib/positioning"

/** Câte query-uri folosim per personaj (chiar dacă AI-ul dă mai multe).
 *  2 = board echilibrat + onboarding mai rapid (fiecare query e o căutare de rețea). */
const MAX_QUERIES_PER_CHARACTER = 2

/** Câte căutări de imagini rulăm simultan. Le paralelizăm ca să nu așteptăm
 *  fiecare query pe rând (o carte cu multe personaje = zeci de căutări), dar
 *  păstrăm un plafon ca să nu izbim toate API-urile de muzeu deodată și să nu
 *  lovim rate-limit-urile lor. 6 = compromis bun între viteză și politețe. */
const SEARCH_CONCURRENCY = 6

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
  /** Pozițiile fragmentelor DEJA prezente pe board. Esențial când funcția e
   *  chemată câte un personaj o dată (fluxul din fundal): fără ele, fiecare apel
   *  ar începe de la zero și ar pune prima poză mereu în centru → toate se
   *  suprapun. Cu ele, `findOptimalPosition` evită și ce e deja plasat. */
  existingPositions: Point[] = [],
): Promise<Fragment[]> {
  // 1. Aplatizăm toate perechile (personaj, query) într-o singură listă de căutări.
  //    Fiecare căutare e o operațiune de rețea independentă.
  const searches = characters.flatMap((character) =>
    character.imageQueries
      .slice(0, MAX_QUERIES_PER_CHARACTER)
      .map((query) => ({ character, query })),
  )

  // 2. Rulăm căutările ÎN PARALEL (cu plafon de concurență). Aici e câștigul de
  //    viteză: o carte cu multe personaje (ex. „Război și pace") făcea zeci de
  //    căutări una câte una; acum merg simultan. Păstrăm ordinea din `searches`,
  //    ca plasarea de mai jos să fie deterministă.
  const tops = await mapWithConcurrency(searches, SEARCH_CONCURRENCY, async ({ query }) => {
    const results = await searchImages(query)
    return results[0] // prima imagine găsită (sau undefined dacă niciuna)
  })

  // 3. PLASAREA rămâne secvențială: fiecare poziție depinde de fragmentele deja
  //    puse (findOptimalPosition), iar mărimea/rotația de câte am plasat. Iterăm
  //    în ordinea originală, deci layout-ul e identic cu varianta veche.
  const fragments: Fragment[] = []
  // Pornim de la ce e DEJA pe board, ca noile poze să nu cadă peste el.
  const positions: Point[] = [...existingPositions]
  let placed = 0 // câte am pus până acum (pentru a varia mărimea/rotația)

  for (let i = 0; i < searches.length; i++) {
    const top = tops[i]
    if (!top) continue // niciun rezultat pentru acest query — sărim

    const { character, query } = searches[i]

    // Poziție cât mai departe de tot ce e deja plasat + o rotație ușoară.
    const { x, y } = findOptimalPosition(positions)
    positions.push({ x, y }) // o luăm în calcul pentru fragmentele următoare
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

  return fragments
}

/**
 * Rulează `fn` pe fiecare element din `items`, cu cel mult `limit` apeluri în
 * curs simultan. Întoarce rezultatele în ACEEAȘI ordine ca `items` (nu în ordinea
 * în care se termină) — esențial ca plasarea de mai sus să fie deterministă.
 */
async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length)
  let next = 0 // indexul următorului element de procesat

  // Pornim `limit` „muncitori" care iau pe rând câte un index din coadă.
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++
      results[i] = await fn(items[i])
    }
  })

  await Promise.all(workers)
  return results
}
