/**
 * europeana.ts — caută imagini prin Europeana (europeana.eu).
 *
 * Europeana e portalul de patrimoniu cultural al UE: milioane de obiecte din
 * muzee, biblioteci și arhive europene. PERFECT pentru clasici europeni
 * (Dostoievski, Tolstoi, Eliade) — picturi, manuscrise, fotografii de epocă.
 *
 * Necesită o CHEIE API gratuită (fără card):
 *   1. Cont gratuit pe https://pro.europeana.eu/page/get-api
 *   2. Primești cheia pe email.
 *   3. O pui în `.env.local` ca:  EUROPEANA_API_KEY=cheia_ta
 *
 * Dacă cheia lipsește, funcția întoarce pur și simplu [] (nu strică federația —
 * celelalte surse merg mai departe).
 *
 * LICENȚE (vezi STAGIUL 7.5):
 * Europeana știe ce drepturi are pentru fiecare obiect — îi spunem în filtru
 * să ne dea DOAR obiecte cu Public Domain Mark sau CC0. Filtrul îl facem
 * server-side (parametrul `qf=RIGHTS:...`), nu client-side, ca să nu primim
 * deloc obiecte sub copyright. Verificăm și pe client câmpul `rights` al
 * fiecărui rezultat — plasă de siguranță, în caz că filtrul serverului
 * scapă ceva.
 */

import type { ImageResult, License } from "./types"

const ENDPOINT = "https://api.europeana.eu/record/v2/search.json"

/** Câte rezultate cerem per căutare. */
const ROWS = 10

/** URI-urile de drepturi pe care le acceptăm. Sunt valorile standard
 *  rightsstatements.org / creativecommons.org pe care Europeana le folosește. */
const PUBLIC_DOMAIN_MARK = "http://creativecommons.org/publicdomain/mark/1.0/"
const CC0 = "http://creativecommons.org/publicdomain/zero/1.0/"

/**
 * Filtru pentru parametrul `qf` al API-ului Europeana.
 * Sintaxa e Lucene: `RIGHTS:("URI1" OR "URI2")` ⇒ doar obiecte cu drepturile astea.
 */
const RIGHTS_FILTER = `RIGHTS:("${PUBLIC_DOMAIN_MARK}" OR "${CC0}")`

/**
 * Caută în Europeana și întoarce imagini normalizate.
 * Întoarce `[]` dacă lipsește cheia sau la orice problemă — nu aruncă.
 */
export async function searchEuropeana(query: string): Promise<ImageResult[]> {
  const apiKey = process.env.EUROPEANA_API_KEY
  if (!apiKey) return [] // fără cheie, sărim sursa în liniște

  try {
    const params = new URLSearchParams({
      wskey: apiKey,
      query,
      rows: String(ROWS),
      media: "true", // doar obiecte care AU media
      profile: "rich", // metadate mai bogate (autor, an, drepturi)
    })
    // `qf` (query filter) îl adăugăm separat ca să fie două filtre distincte;
    // dacă le-am combina într-un string singur, codarea ar fi greșită.
    params.append("qf", "TYPE:IMAGE")
    params.append("qf", RIGHTS_FILTER)

    const res = await fetch(`${ENDPOINT}?${params.toString()}`)
    if (!res.ok) return []

    const data = await res.json()
    const items: any[] = data?.items ?? []

    const results: ImageResult[] = []
    for (const it of items) {
      // edmIsShownBy = imaginea în rezoluție mare; edmPreview = thumbnail.
      const full: string | undefined = it.edmIsShownBy?.[0] || it.edmPreview?.[0]
      if (!full) continue

      // Plasă de siguranță: verificăm și pe client că drepturile sunt OK.
      // Câmpul `rights` e un array de URI-uri (de regulă cu unul singur).
      const license = detectLicense(it.rights)
      if (!license) continue

      results.push({
        url: full,
        thumbUrl: it.edmPreview?.[0] || undefined,
        title: first(it.title),
        author: first(it.dcCreator),
        year: first(it.year),
        source: "europeana",
        sourceUrl: it.guid || undefined, // pagina obiectului pe portalul Europeana
        license,
        requiresAttribution: false, // PD Mark / CC0 nu cer atribuire pe ecran
      })
    }
    return results
  } catch {
    return []
  }
}

/** Mapează URI-ul de drepturi la enum-ul nostru de licență. */
function detectLicense(rights?: string[]): License | null {
  if (!rights || rights.length === 0) return null
  const uri = rights[0]
  if (uri === PUBLIC_DOMAIN_MARK) return "public-domain"
  if (uri === CC0) return "cc0"
  return null
}

/** Europeana întoarce multe câmpuri ca array-uri; luăm primul element util. */
function first(value?: string[]): string | undefined {
  const v = value?.[0]?.trim()
  return v || undefined
}
