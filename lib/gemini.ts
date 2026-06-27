/**
 * Gemini — clientul reutilizabil de AI (Google Generative Language API).
 *
 * De ce Gemini: are tier gratuit generos (1500 req/zi, 1M context, fără card).
 * De ce `fetch` direct și nu librăria oficială: zero dependențe noi de instalat,
 * și se vede exact ce trimitem/primim — mai ușor de depanat pentru un începător.
 *
 * REGULĂ DE AUR: acest fișier rulează DOAR pe server (rute /api/ și scripturi).
 * Cheia `GEMINI_API_KEY` nu ajunge niciodată în browser. Nu importa acest fișier
 * dintr-o componentă cu "use client".
 */

/** Modelul implicit: 2.5-flash e rapid și gratuit. Poate fi schimbat din .env. */
const DEFAULT_MODEL = "gemini-2.5-flash"

/** Câte ori reîncercăm dacă Gemini e momentan aglomerat. */
const MAX_RETRIES = 3

/** Coduri de eroare temporare, care merită reîncercate (aglomerare / limită de rată). */
const RETRYABLE_STATUS = new Set([429, 500, 503])

/** Mică pauză (în milisecunde) — folosită între reîncercări. */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Opțiunile pentru un apel către Gemini. */
interface GenerateOptions {
  /** Întrebarea/instrucțiunea concretă a utilizatorului (mesajul "user"). */
  prompt: string
  /** Instrucțiune de sistem: rolul + regulile pe care AI-ul le respectă mereu. */
  systemInstruction?: string
  /** 0 = foarte predictibil, 1 = mai creativ. Pentru date structurate ținem jos. */
  temperature?: number
}

/**
 * Trimite un prompt la Gemini și cere răspuns JSON STRICT.
 *
 * Folosim `responseMimeType: "application/json"`, care obligă modelul să răspundă
 * cu JSON curat — fără ```json, fără explicații în jur. Returnăm obiectul deja
 * parsat (`JSON.parse`), ca tip generic `T`. Validarea formei (cu Zod) se face
 * mai sus, în `lib/book-ai.ts`.
 *
 * Citim cheia din `process.env` DOAR la apel (nu la import), ca scriptul de test
 * să apuce să încarce `.env.local` în `process.env` înainte.
 */
export async function generateJson<T = unknown>({
  prompt,
  systemInstruction,
  temperature = 0.4,
}: GenerateOptions): Promise<T> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error(
      "Lipsește GEMINI_API_KEY din .env.local. " +
        "Ia o cheie gratuită de la https://aistudio.google.com/apikey",
    )
  }

  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`

  // Corpul cererii, în formatul cerut de Gemini REST API.
  const body = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    ...(systemInstruction
      ? { systemInstruction: { parts: [{ text: systemInstruction }] } }
      : {}),
    generationConfig: {
      responseMimeType: "application/json",
      temperature,
    },
  }

  // Reîncercăm de câteva ori dacă modelul e aglomerat (503/429/500).
  // Așteptăm tot mai mult între încercări: 1s, apoi 2s, apoi 4s (backoff).
  let res: Response | undefined
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Cheia merge în header, nu în URL (nu apare în log-uri de proxy).
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify(body),
    })

    if (res.ok) break

    // Eroare temporară și mai avem încercări? Așteaptă și reîncearcă.
    if (RETRYABLE_STATUS.has(res.status) && attempt < MAX_RETRIES) {
      await sleep(1000 * 2 ** (attempt - 1))
      continue
    }

    // Eroare definitivă (cheie greșită, 400 etc.) sau am rămas fără încercări.
    const detail = await res.text()
    throw new Error(`Gemini a răspuns cu ${res.status}: ${detail}`)
  }

  const data = await res!.json()

  // Calea către text în răspunsul Gemini: candidates[0].content.parts[0].text
  const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) {
    // Cel mai des: promptul a fost blocat de filtrele de siguranță.
    const reason = data?.promptFeedback?.blockReason ?? "necunoscut"
    throw new Error(`Gemini nu a returnat text (motiv: ${reason}).`)
  }

  try {
    return JSON.parse(text) as T
  } catch {
    throw new Error(`Răspunsul Gemini nu e JSON valid:\n${text.slice(0, 500)}`)
  }
}
