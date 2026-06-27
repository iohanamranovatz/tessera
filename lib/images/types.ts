/**
 * types.ts — forma comună a unui rezultat de imagine, indiferent de sursă.
 *
 * Fiecare sursă (Met Museum, Wikimedia, mai târziu Europeana/Openverse/Unsplash)
 * întoarce date în formatul ei propriu. Le traducem pe toate în `ImageResult`,
 * ca restul aplicației (căutarea federată, UI-ul) să lucreze cu UN singur tip.
 */

/** De unde provine imaginea — util pentru atribuire și depanare. */
export type ImageSource = "met" | "wikimedia" | "europeana" | "openverse" | "unsplash"

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
  /** Anul/perioada, ca text (ex: "1872", "ca. 1880"). */
  year?: string
  /** Din ce sursă vine. */
  source: ImageSource
  /** Link către pagina operei pe site-ul sursă (pentru atribuire/detalii). */
  sourceUrl?: string
}
