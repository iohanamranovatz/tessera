/**
 * wikipedia.ts — aducem textul articolului Wikipedia despre o carte.
 *
 * De ce: e prima jumătate din RAG (Retrieval-Augmented Generation). Înainte ca
 * AI-ul să "scrie din memorie" (și uneori să halucineze), îi dăm un text REAL
 * despre carte — articolul Wikipedia — ca să se bazeze pe el. A doua jumătate
 * (a-i pasa textul lui Gemini) se face în `lib/book-ai.ts`.
 *
 * Folosim API-ul public Wikipedia (gratis, fără cheie). Rulează pe server, dar
 * n-are secrete — l-ai putea chema și din browser. Îl ținem aici pentru ordine.
 *
 * Politețe față de Wikipedia: trimitem un header `User-Agent` care spune cine
 * suntem (e cerut de regulile lor). Nu abuzăm — un singur apel per carte.
 */

/** Câte caractere de articol păstrăm. Mai mult = context mai bun, dar prompt mai
 *  scump și mai lent. 5000 acoperă intro + rezumatul subiectului la majoritatea
 *  cărților. */
const MAX_CHARS = 5000

/** Limbile încercate, ÎN ORDINE. Aplicația e în engleză, deci întâi engleza
 *  (articole mai complete, consistente cu descrierile AI). Româna rămâne fallback
 *  pentru autori/cărți care există doar pe Wikipedia RO (ex: Cărtărescu, Eliade). */
const LANGUAGES = ["en", "ro"] as const
export type WikiLang = (typeof LANGUAGES)[number]

/** Ce întoarce funcția când găsește un articol. */
export interface WikipediaArticle {
  /** Titlul exact al paginii găsite pe Wikipedia (poate diferi de ce-am căutat). */
  title: string
  /** Textul curat al articolului (fără wiki-markup), tăiat la MAX_CHARS. */
  text: string
  /** Limba în care am găsit articolul ("ro" sau "en"). */
  language: WikiLang
  /** Link-ul către pagină (util pentru atribuire/depanare). */
  url: string
}

/**
 * Caută articolul pentru o singură limbă și întoarce textul, sau `null` dacă
 * nu există pagină relevantă în acea limbă.
 *
 * Trucul: cu `generator=search` + `prop=extracts` facem TOTUL într-un apel —
 * Wikipedia caută cea mai bună pagină pentru query-ul nostru ȘI ne dă direct
 * textul ei curat (`explaintext=1` = fără markup, doar text simplu).
 */
async function fetchFromLanguage(
  query: string,
  language: WikiLang,
): Promise<WikipediaArticle | null> {
  const endpoint = `https://${language}.wikipedia.org/w/api.php`

  // Parametrii cererii. URLSearchParams se ocupă de encodarea corectă.
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    prop: "extracts",
    explaintext: "1", // text simplu, fără HTML/wiki-markup
    redirects: "1", // urmează redirecturile (ex: "Karamazov" → titlul complet)
    generator: "search", // întâi caută...
    gsrsearch: query, // ...după textul ăsta...
    gsrlimit: "1", // ...și ia doar primul (cel mai relevant) rezultat.
  })

  let res: Response
  try {
    res = await fetch(`${endpoint}?${params.toString()}`, {
      headers: {
        // Wikipedia cere un User-Agent care identifică aplicația.
        "User-Agent": "Tessera/0.1 (literary moodboard; educational project)",
      },
    })
  } catch {
    // Probleme de rețea — tratăm ca "negăsit" și lăsăm fallback-ul să încerce.
    return null
  }

  if (!res.ok) return null

  const data = await res.json()

  // `data.query.pages` e un OBIECT cheiat pe id de pagină, ex: { "12345": {...} }.
  // Dacă n-a găsit nimic, `pages` lipsește cu totul.
  const pages = data?.query?.pages
  if (!pages) return null

  // Luăm prima (și singura) pagină din obiect.
  const page: any = Object.values(pages)[0]
  const extract: string | undefined = page?.extract

  // Articol gol sau pagină inexistentă ("missing") → nu ne folosește.
  if (!extract || extract.trim().length === 0) return null

  const pageTitle: string = page.title
  return {
    title: pageTitle,
    text: extract.slice(0, MAX_CHARS),
    language,
    url: `https://${language}.wikipedia.org/wiki/${encodeURIComponent(
      pageTitle.replace(/ /g, "_"),
    )}`,
  }
}

/**
 * Aduce articolul Wikipedia despre o carte, cu fallback de limbă.
 *
 * Strategie: încearcă română → engleză → `null`. Dacă știm autorul, îl punem în
 * căutare ("titlu autor") ca să nimerim cartea, nu o pagină cu același nume.
 *
 * @param title  Titlul cărții (ex: "Frații Karamazov").
 * @param author Autorul, opțional — îmbunătățește precizia căutării.
 * @returns Articolul găsit, sau `null` dacă nu există nicăieri.
 */
export async function fetchBookArticle(
  title: string,
  author?: string,
): Promise<WikipediaArticle | null> {
  // Includem autorul în query dacă-l avem (dar îl căutăm tot ca text liber).
  const query = author ? `${title} ${author}` : title

  for (const language of LANGUAGES) {
    const article = await fetchFromLanguage(query, language)
    if (article) return article
  }

  // Nicăieri găsit — RAG-ul pur și simplu nu se aplică pentru cartea asta.
  return null
}
