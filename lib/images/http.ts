/**
 * http.ts — un singur `fetchJson` folosit de TOȚI clienții de imagini.
 *
 * Înainte, fiecare sursă chema `fetch` direct, fără timeout. Consecința:
 * o sursă care atârnă (API de muzeu lent, DNS prost) bloca TOATĂ căutarea
 * federată — `Promise.all` din index.ts aștepta cât cea mai lentă, la infinit.
 * Aici punem un buget de timp pe FIECARE cerere, deci latența are plafon.
 *
 * Contractul e „întoarce null la orice problemă" (rețea, timeout, status != 2xx,
 * JSON invalid). Asta păstrează exact stilul clienților existenți: ei înghit
 * erorile și întorc `[]`, ca o sursă picată să nu dărâme restul federației.
 *
 * Despre CACHE: cererile cacheabile primesc `next: { revalidate }`, deci intră
 * în Data Cache-ul Next (persistă între cereri, și pe disc). Măsurat pe setul
 * nostru de query-uri: ~3.5s la rece vs ~0.75s cu cache-ul cald, deci chiar
 * funcționează alături de `signal`. Peste el mai stă un memo la nivel de query,
 * în index.ts, care scutește inclusiv munca de parsare/filtrare.
 */

/** Bugetul implicit de timp pentru o cerere. Peste atât, sursa e abandonată. */
const DEFAULT_TIMEOUT_MS = 6000

/**
 * Câte cereri simultane permitem către ACELAȘI host.
 *
 * De ce există: API-urile de muzeu ne limitează rata. Măsurat pe Wikimedia
 * Commons — la 16 cereri paralele, primele ~9 trec, restul primesc
 * `HTTP 429` cu `Retry-After: 52`. Un 429 înseamnă că sursa întoarce []
 * și pierdem imaginea, deși ea exista: exact așa ajungeau pe board doar
 * câteva fragmente în loc de toate.
 *
 * Nu putem aștepta 52 de secunde ca să reîncercăm, deci soluția e să nu
 * ajungem acolo: punem cererile la coadă pe host. Întârzie puțin, dar nimic
 * nu se mai pierde — iar cu memo-ul din index.ts coada se golește repede.
 *
 * Limita NU e aceeași pentru toate: Commons e de departe cel mai strict, pe
 * când Met suportă liniștit mai multe (și oricum are nevoie, fiindcă face un
 * apel de detaliu per obiect). De aceea ținem praguri pe host.
 */
const DEFAULT_MAX_CONCURRENT = 4

const PER_HOST_LIMIT: Record<string, number> = {
  // Măsurat: la 16 cereri paralele, de la a ~9-a începe 429 cu Retry-After 52s.
  "commons.wikimedia.org": 3,
  // Met nu ne-a limitat; are nevoie de lărgime fiindcă o căutare înseamnă
  // 1 apel de căutare + câteva apeluri de detaliu.
  "collectionapi.metmuseum.org": 8,
}

function limitFor(host: string): number {
  return PER_HOST_LIMIT[host] ?? DEFAULT_MAX_CONCURRENT
}

/** Starea cozii pentru un host: câte cereri sunt în curs și cine așteaptă. */
interface HostQueue {
  active: number
  waiting: Array<() => void>
}

const hostQueues = new Map<string, HostQueue>()

/** Ia un „loc" pentru host (așteaptă dacă toate sunt ocupate). */
async function acquire(host: string): Promise<void> {
  let q = hostQueues.get(host)
  if (!q) {
    q = { active: 0, waiting: [] }
    hostQueues.set(host, q)
  }
  if (q.active < limitFor(host)) {
    q.active++
    return
  }
  // Toate locurile ocupate: ne punem la coadă și așteptăm să ne cheme release.
  await new Promise<void>((resolve) => q!.waiting.push(resolve))
}

/** Eliberează locul și pornește următoarea cerere din coadă, dacă e vreuna. */
function release(host: string): void {
  const q = hostQueues.get(host)
  if (!q) return
  const next = q.waiting.shift()
  if (next) {
    next() // locul trece direct la următorul — `active` rămâne neschimbat
  } else {
    q.active--
  }
}

/** User-Agent-ul cerut de API-urile Wikimedia/Openverse (politica lor de acces). */
const USER_AGENT = "Tessera/0.1 (literary moodboard; educational project)"

export interface FetchJsonOptions {
  /** Bugetul de timp în ms. Implicit 4000. */
  timeoutMs?: number
  /**
   * Câte secunde poate fi reutilizat răspunsul din Data Cache.
   * Îl dăm DOAR surselor cacheabile (muzee: PD/CC0). Pentru Unsplash
   * îl lăsăm nedefinit și trimitem `cache: "no-store"` — licența lor
   * interzice cache-uirea (vezi unsplash.ts).
   */
  revalidate?: number
  /** Headere suplimentare (ex: Authorization pentru Unsplash). */
  headers?: Record<string, string>
}

/**
 * Cere un JSON, cu timeout. Întoarce obiectul parsat, sau `null` la orice eșec.
 *
 * @param url URL-ul complet (cu query string deja construit).
 */
export async function fetchJson<T = any>(
  url: string,
  options: FetchJsonOptions = {},
): Promise<T | null> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, revalidate, headers } = options

  // Hostul e cheia cozii. Cererile de detaliu ale Met merg către același host
  // ca și căutarea, deci intră automat sub aceeași limită — exact ce vrem.
  let host: string
  try {
    host = new URL(url).host
  } catch {
    return null // URL invalid — tratat ca orice alt eșec
  }

  await acquire(host)
  try {
    const res = await fetch(url, {
      // AbortSignal.timeout anulează cererea singur după `timeoutMs` —
      // mai curat decât un AbortController + setTimeout de mână (nu lasă
      // timere agățate dacă cererea se termină la timp).
      signal: AbortSignal.timeout(timeoutMs),
      headers: { "User-Agent": USER_AGENT, ...headers },
      // Sursele cacheabile declară `revalidate`; Unsplash primește no-store.
      ...(revalidate !== undefined
        ? { next: { revalidate } }
        : { cache: "no-store" as RequestCache }),
    })

    if (!res.ok) {
      // 429 = am depășit rata permisă. Nu reîncercăm (Retry-After e de ordinul
      // zecilor de secunde), dar îl semnalăm: dacă apare, înseamnă că limita
      // de mai sus e prea permisivă pentru sursa asta.
      if (res.status === 429) {
        console.warn(`[images] ${host} ne-a limitat rata (429). Scade pragul lui din PER_HOST_LIMIT.`)
      }
      return null
    }
    return (await res.json()) as T
  } catch {
    // Timeout, rețea picată sau JSON invalid — pentru apelant sunt același
    // lucru: „sursa asta nu a dat nimic".
    return null
  } finally {
    release(host)
  }
}
