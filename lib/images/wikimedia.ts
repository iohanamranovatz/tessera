/**
 * wikimedia.ts — caută imagini în Wikimedia Commons.
 *
 * API public, GRATIS, fără cheie. Commons e arhiva de media liberă a Wikipediei:
 * picturi, fotografii istorice, hărți, portrete — multe în domeniul public sau
 * sub licențe libere. Spre deosebire de Met, aici API-ul ne dă ȘI dimensiunile
 * imaginii (width/height), deci putem filtra curat după rezoluție.
 *
 * Trucul (un singur apel): `generator=search` caută fișiere în namespace-ul 6
 * (File:) iar `prop=imageinfo` ne dă pentru fiecare URL-ul, dimensiunile și
 * metadatele (autor, an, licență) — totul deodată.
 *
 * LICENȚE (vezi STAGIUL 7.5):
 * Commons are de toate — de la PD pur până la CC BY-SA. Acceptăm DOAR:
 *   - Public Domain (orice variantă: PD-old, PD-US, PDM)
 *   - CC0 (renunțare la drepturi)
 * EXCLUDEM EXPLICIT orice licență care conține „SA" (share-alike),
 * fiindcă ne-ar obliga să facem aplicația open source.
 * Excludem și CC BY (atribuire obligatorie) — fiindcă pe Wikimedia atribuirea
 * lui Commons e complexă (autor + sursă + license + link), preferăm să luăm
 * doar PD/CC0 unde nu avem obligații, și mutăm fotografiile cu atribuire pe
 * Unsplash unde am proiectat UI-ul de atribuire.
 */

import type { ImageResult, License } from "./types"

const ENDPOINT = "https://commons.wikimedia.org/w/api.php"

/** Câte fișiere cerem. Cerem mai multe decât ținem, fiindcă unele pică la filtru. */
const SEARCH_LIMIT = 15

/** Lățimea (px) a thumbnail-ului pe care îl cerem pentru preview. */
const THUMB_WIDTH = 600

/** Doar formate de imagine afișabile în browser. Commons mai are PDF, DjVu, TIFF,
 *  SVG etc. — pe care un <img> nu le redă cum trebuie, așa că le excludem. */
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"])

/**
 * Caută în Wikimedia Commons și întoarce imagini normalizate.
 * Întoarce `[]` la orice problemă — nu aruncă (vezi nota din met-museum.ts).
 */
export async function searchWikimedia(query: string): Promise<ImageResult[]> {
  try {
    const params = new URLSearchParams({
      action: "query",
      format: "json",
      origin: "*", // permite și apel din browser, fără probleme de CORS
      generator: "search",
      gsrsearch: query,
      gsrnamespace: "6", // 6 = namespace-ul „File:" (doar fișiere)
      gsrlimit: String(SEARCH_LIMIT),
      prop: "imageinfo",
      iiprop: "url|size|extmetadata|mime", // url + dimensiuni + tip fișier + metadate
      iiurlwidth: String(THUMB_WIDTH), // cere și un thumbnail de această lățime
    })

    const res = await fetch(`${ENDPOINT}?${params.toString()}`, {
      headers: { "User-Agent": "Tessera/0.1 (literary moodboard; educational project)" },
    })
    if (!res.ok) return []

    const data = await res.json()
    const pages = data?.query?.pages
    if (!pages) return []

    const results: ImageResult[] = []
    for (const page of Object.values<any>(pages)) {
      const info = page?.imageinfo?.[0]
      if (!info?.url) continue

      // Sărim orice nu e o imagine web afișabilă (PDF, DjVu, TIFF, SVG, audio…).
      if (!ALLOWED_MIME.has(info.mime)) continue

      // extmetadata ține autorul/anul/licența ca text (uneori cu HTML — îl curățăm).
      const meta = info.extmetadata ?? {}

      // FILTRU DE LICENȚĂ — vezi nota din capul fișierului.
      const license = detectLicense(meta)
      if (!license) continue // nu am putut confirma PD/CC0 → sărim (politică „deny by default")

      results.push({
        url: info.url,
        thumbUrl: info.thumburl || undefined,
        width: info.width,
        height: info.height,
        title: stripHtml(page.title?.replace(/^File:/, "")),
        author: stripHtml(meta.Artist?.value),
        year: cleanYear(stripHtml(meta.DateTimeOriginal?.value)),
        source: "wikimedia",
        sourceUrl: info.descriptionurl || undefined,
        license,
        requiresAttribution: false, // PD/CC0 nu cer atribuire pe ecran
      })
    }
    return results
  } catch {
    return []
  }
}

/**
 * Detectează dacă licența unei imagini de pe Commons e PD sau CC0.
 * Întoarce `null` dacă licența NU e clar PD/CC0 (sau dacă e SA / nu o putem
 * citi) — apelantul aruncă imaginea.
 *
 * Pe Commons, licența vine în două câmpuri (oricare poate lipsi):
 *   - `LicenseShortName.value` — text scurt: „CC0", „Public domain", „CC BY-SA 4.0"
 *   - `License.value` — slug: „cc0", „pd", „cc-by-sa-4.0"
 * Citim ambele, le normalizăm la litere mici și aplicăm regulile.
 */
function detectLicense(meta: any): License | null {
  const shortName = String(meta?.LicenseShortName?.value ?? "").toLowerCase()
  const slug = String(meta?.License?.value ?? "").toLowerCase()
  const blob = `${shortName} ${slug}`

  if (!blob.trim()) return null // nu avem nicio info de licență → nu riscăm

  // Refuz explicit: orice formă de Share-Alike sau No-Derivatives.
  // (cc-by-sa, cc-by-nd, gfdl etc. — fiecare are propriile bătăi de cap.)
  if (/\b(sa|nd|nc)\b|share[- ]?alike|noderiv|noncommercial|gfdl/.test(blob)) return null

  // Acceptăm: CC0 (renunțare la drepturi).
  if (/\bcc0\b|cc-zero|publicdomain\/zero/.test(blob)) return "cc0"

  // Acceptăm: Public Domain sub orice formă (PD-old, PD-US, PDM, „public domain").
  if (/\bpd\b|public[- ]?domain|publicdomain\/mark/.test(blob)) return "public-domain"

  return null // orice altceva (inclusiv CC BY pur) → respins, ca să fim conservatori
}

/** Scoate tag-urile HTML din metadatele Commons (ex: <a>...</a>) și spațiile în plus. */
function stripHtml(value?: string): string | undefined {
  if (!value) return undefined
  const clean = value.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim()
  return clean || undefined
}

/**
 * Curăță câmpul de an. Commons pune uneori metadate structurate după dată
 * (ex: "1893date QS:P571,+1893-..."). Tăiem la primul "date QS" și păstrăm doar
 * partea lizibilă din față (ex: "1893" sau "after 1625").
 */
function cleanYear(value?: string): string | undefined {
  if (!value) return undefined
  const clean = value.split(/date QS/i)[0].trim()
  return clean || undefined
}
