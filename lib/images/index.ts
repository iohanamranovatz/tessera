/**
 * index.ts — căutarea FEDERATĂ de imagini.
 *
 * O singură funcție publică: `searchFirstImage(query)` — o imagine, cât mai
 * repede, din colecții legal libere.
 *
 *   STRATUL 1 — surse de muzeu (principale): Met, Europeana, Wikimedia,
 *     Openverse. NU le pornim pe toate deodată: prima pleacă imediat, iar
 *     următoarele doar dacă ea întârzie (vezi `raceFirstPrimary`). Așa evităm
 *     rate-limit-urile lor, care altfel ne lăsau cu jumătate din imagini.
 *
 *   STRATUL 2 — Unsplash (FALLBACK), chemat DOAR dacă muzeele n-au găsit nimic.
 *     Util pentru cărți contemporane. Așa evităm și constrângerile Unsplash
 *     (atribuire obligatorie, fără cache) atunci când nu avem nevoie de el.
 *
 * Peste tot stă un memo pe query + deduplicarea cererilor în curs, deci același
 * query căutat de două ori nu atinge rețeaua a doua oară.
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

/** Sursele PRINCIPALE (muzee), chemate mereu, în paralel. Ordinea = round-robin. */
const PRIMARY_SOURCES: Array<(query: string) => Promise<ImageResult[]>> = [
  searchMet,
  searchEuropeana,
  searchWikimedia,
  searchOpenverse,
]

/** Cât ținem minte rezultatul unei căutări (ms). 10 minute: destul ca un
 *  onboarding întreg (și re-rulările lui) să nu mai atingă rețeaua, dar nu
 *  atât încât să ținem memorie ocupată degeaba într-un proces lung. */
const MEMO_TTL_MS = 10 * 60 * 1000

/** Fereastra de grație (ms): după ce o sursă a răspuns cu o imagine bună, mai
 *  așteptăm atât pentru una de prioritate mai mare (ordinea din
 *  PRIMARY_SOURCES). Așa câștigăm viteză fără să renunțăm la calitate când
 *  Met/Europeana sunt doar cu o fracțiune de secundă în spate. */
const GRACE_MS = 250

/** Cât așteptăm înainte să pornim următoarea sursă de rezervă (vezi pornirea
 *  eșalonată din `raceFirstPrimary`). Destul cât sursa principală să apuce să
 *  răspundă în cazul normal — deci rezervele nici nu pleacă — dar destul de
 *  scurt cât să nu se simtă când chiar e nevoie de ele. */
const STAGGER_MS = 600

/**
 * Memo la nivel de QUERY. Cheia e query-ul, valoarea prima imagine găsită.
 * Păstrăm și `undefined` (query fără rezultate) ca să nu reinterogăm patru
 * API-uri pentru ceva ce știm că nu dă nimic.
 *
 * NU intră aici imaginile de pe Unsplash — licența lor interzice cache-ul
 * (vezi unsplash.ts). Doar PD/CC0, care avem voie să le reținem.
 */
const memo = new Map<string, { at: number; result: ImageResult | undefined }>()

/**
 * Căutări ÎN CURS, pe query. Două personaje cu același query vizual (se întâmplă
 * des — „mănăstire ortodoxă rusă" apare la mai mulți) împart o singură
 * operațiune de rețea în loc să o facă fiecare pe a lui.
 */
const inFlight = new Map<string, Promise<ImageResult | undefined>>()

/**
 * Întoarce O SINGURĂ imagine pentru `query`, cât mai repede.
 *
 * Asta e funcția pe care o folosește fluxul de fragmente: pornește sursele de
 * muzeu (eșalonat, vezi mai jos) și se oprește la prima imagine bună. Plus memo
 * + deduplicare de cereri în curs, deci al doilea apel cu același query e instant.
 */
export async function searchFirstImage(query: string): Promise<ImageResult | undefined> {
  const key = query.trim().toLowerCase()

  // 1. Îl știm deja și e încă proaspăt?
  const hit = memo.get(key)
  if (hit && Date.now() - hit.at < MEMO_TTL_MS) return hit.result
  if (hit) memo.delete(key) // expirat — îl scoatem ca să nu crească harta

  // 2. Îl caută deja altcineva? Atașăm-ne la aceeași promisiune.
  const pending = inFlight.get(key)
  if (pending) return pending

  // 3. Pornim căutarea, înregistrând-o ca „în curs".
  const work = (async () => {
    try {
      const primary = await raceFirstPrimary(query)
      if (primary) {
        memo.set(key, { at: Date.now(), result: primary })
        return primary
      }

      // Muzeele n-au găsit nimic: cădem pe Unsplash (cărți contemporane).
      // Rezultatul NU se memorează — Unsplash interzice cache-ul.
      const unsplash = rank(await searchUnsplash(query), new Set<string>())
      if (unsplash.length > 0) return unsplash[0]

      // Nimic, nicăieri. Ținem minte și asta (e un rezultat PD valid: „gol").
      memo.set(key, { at: Date.now(), result: undefined })
      return undefined
    } finally {
      inFlight.delete(key)
    }
  })()

  inFlight.set(key, work)
  return work
}

/**
 * Pornește sursele de muzeu și se oprește la PRIMA imagine bună.
 *
 * „Prioritate" = poziția în PRIMARY_SOURCES (Met, Europeana, Wikimedia,
 * Openverse). Dacă răspunde prima o sursă de prioritate mică dar una mai bună
 * mai are șanse, așteptăm GRACE_MS pentru ea.
 *
 * Întoarce `undefined` dacă nicio sursă de muzeu nu a dat nimic utilizabil.
 */
function raceFirstPrimary(query: string): Promise<ImageResult | undefined> {
  // `seen` e partajat doar ca sursele să nu propună aceeași imagine; cum luăm
  // una singură, efectul e marginal — dar păstrează semantica lui `rank`.
  const seen = new Set<string>()
  // settled[i] === undefined ⇒ sursa i încă nu a răspuns (sau n-a pornit).
  const settled = new Array<ImageResult[] | undefined>(PRIMARY_SOURCES.length)
  // Câte surse AU PORNIT și încă nu au răspuns. Creștem la pornire, scădem la
  // răspuns — nu putem porni de la 4, fiindcă unele s-ar putea să nu plece deloc.
  let inFlightCount = 0
  let startedAll = false

  return new Promise<ImageResult | undefined>((resolve) => {
    let done = false
    let graceTimer: ReturnType<typeof setTimeout> | undefined
    // Cronometrele care urmează să pornească sursele de rezervă.
    const starters: Array<ReturnType<typeof setTimeout>> = []

    /** Indexul celei mai bine clasate surse care a răspuns cu ceva, sau -1. */
    function winnerIndex(): number {
      return settled.findIndex((results) => results !== undefined && results.length > 0)
    }

    function finish() {
      if (done) return
      done = true
      if (graceTimer) clearTimeout(graceTimer)
      // Sursele care nu au apucat să plece nu mai pleacă — aici e economia de
      // cereri care ne scapă de rate-limit.
      for (const t of starters) clearTimeout(t)
      const i = winnerIndex()
      resolve(i === -1 ? undefined : settled[i]![0])
    }

    function onSettle() {
      inFlightCount--
      if (done) return

      // Toate au pornit și toate au răspuns: nu mai are rost să așteptăm.
      if (startedAll && inFlightCount === 0) return finish()

      const i = winnerIndex()
      if (i === -1) return // încă nimic utilizabil — așteptăm mai departe

      // Dacă toate sursele mai bune au răspuns deja (fie și cu nimic), nu mai
      // poate veni nimic mai bun → ne oprim acum.
      const higherStillPending = settled.slice(0, i).some((r) => r === undefined)
      if (!higherStillPending) return finish()

      // Altfel le dăm o fereastră scurtă. Nu o resetăm la fiecare răspuns —
      // altfel un șir de surse lente ar putea amâna la nesfârșit.
      if (!graceTimer) graceTimer = setTimeout(finish, GRACE_MS)
    }

    function start(i: number) {
      if (done) return
      inFlightCount++
      // Clienții înghit singuri erorile, dar punem și aici o plasă: dacă vreunul
      // ar arunca totuși, nu vrem să rămână promisiunea neterminată pe veci.
      PRIMARY_SOURCES[i](query).then(
        (raw) => {
          settled[i] = rank(raw, seen)
          onSettle()
        },
        () => {
          settled[i] = []
          onSettle()
        },
      )
    }

    // PORNIRE EȘALONATĂ („hedged requests").
    //
    // Varianta care pornea toate cele 4 surse deodată cerea 4 drumuri de rețea
    // pentru FIECARE query, deși aproape mereu primul răspuns era de ajuns. La o
    // carte întreagă (zeci de căutări) asta însemna sute de cereri în câteva
    // secunde, iar Wikimedia Commons răspundea cu HTTP 429 și `Retry-After: 52`
    // — adică sursa pica pentru tot restul generării și rămâneam cu jumătate
    // din fragmente (simptomul raportat: 4 fragmente pentru o carte întreagă).
    //
    // Acum prima sursă pleacă imediat, iar celelalte DOAR dacă ea n-a dat încă
    // un răspuns bun. Când sursa principală merge — cazul normal — restul nu se
    // mai cheamă deloc. Acoperirea rămâne: dacă prima întârzie sau nu găsește
    // nimic, rezervele pornesc pe rând.
    start(0)
    for (let i = 1; i < PRIMARY_SOURCES.length; i++) {
      starters.push(
        setTimeout(() => {
          start(i)
          if (i === PRIMARY_SOURCES.length - 1) startedAll = true
        }, i * STAGGER_MS),
      )
    }
  })
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
  // Plasă de siguranță legală: orice imagine fără `license` clar setat e
  // aruncată. Sursele AR TREBUI să o seteze mereu (vezi STAGIUL 7.5), dar
  // dacă apare un bug în vreun client, nu vrem ca imaginea să ajungă în UI.
  const licensed = images.filter((img) => img.license !== undefined)

  const unique = licensed.filter((img) => {
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
