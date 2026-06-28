/**
 * types.ts — forma comună a unui rezultat de imagine, indiferent de sursă.
 *
 * Fiecare sursă (Met Museum, Wikimedia, Europeana, Openverse, Unsplash)
 * întoarce date în formatul ei propriu. Le traducem pe toate în `ImageResult`,
 * ca restul aplicației (căutarea federată, UI-ul) să lucreze cu UN singur tip.
 *
 * IMPORTANT — licențe (vezi STAGIUL 7.5):
 * Tessera e aplicație publică, deci AFIȘĂM doar imagini legal libere.
 * Câmpul `license` e OBLIGATORIU și e singurul indicator de încredere că
 * o imagine a trecut prin filtrul sursei respective. Dacă o imagine ajunge
 * fără license setat, e un bug în clientul sursei — `index.ts` o elimină
 * ca plasă de siguranță.
 */

/** De unde provine imaginea — util pentru atribuire și depanare. */
export type ImageSource = "met" | "wikimedia" | "europeana" | "openverse" | "unsplash"

/**
 * Licențele pe care le acceptăm.
 *  - `public-domain`: opera nu mai are drepturi (autor decedat > 70 ani, sau
 *    marcată explicit Public Domain Mark). Liber de folosit oriunde.
 *  - `cc0`: autorul a renunțat la drepturi (echivalent practic cu PD).
 *  - `unsplash-license`: licența proprie Unsplash — gratis, dar cu atribuire
 *    obligatorie pe ecran și fără cache pe server.
 *
 * Nu acceptăm `cc-by-sa` (share-alike) — ne-ar obliga să facem aplicația
 * open source. Nu acceptăm `cc-by` simplu nici el aici, ca să păstrăm
 * regula uniformă (PD/CC0 fără atribuire, Unsplash cu atribuire).
 */
export type License = "public-domain" | "cc0" | "unsplash-license"

/** O imagine găsită, normalizată la un format comun. */
export interface ImageResult {
  /** URL-ul imaginii la rezoluție mare (ce afișăm în fragment). */
  url: string
  /** URL-ul unei versiuni mici (preview/thumbnail), dacă sursa oferă una. */
  thumbUrl?: string
  /** Lățimea în pixeli, dacă o știm (Wikimedia o dă; Met nu). */
  width?: number
  /** Înălțimea în pixeli, dacă o știm. */
  height?: number
  /** Titlul operei/fotografiei. */
  title?: string
  /** Autorul: artist (muzee) sau fotograf (Unsplash). */
  author?: string
  /** Link către pagina autorului (ex: profilul fotografului pe Unsplash).
   *  Folosit pentru atribuirea obligatorie la sursele care o cer. */
  authorUrl?: string
  /** true dacă sursa OBLIGĂ afișarea atribuirii pe ecran (ex: Unsplash). */
  requiresAttribution?: boolean
  /** Licența sub care folosim imaginea. Obligatoriu — vezi nota din capul fișierului. */
  license: License
  /** Anul/perioada, ca text (ex: "1872", "ca. 1880"). */
  year?: string
  /** Din ce sursă vine. */
  source: ImageSource
  /** Link către pagina operei pe site-ul sursă (pentru atribuire/detalii). */
  sourceUrl?: string
  /** Unsplash-only: URL-ul de „download tracking" pe care SUNTEM OBLIGAȚI să-l
   *  pingăm când imaginea e efectiv folosită (vezi hooks/useUnsplashTracking.ts). */
  downloadLocation?: string
}
