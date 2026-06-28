/**
 * POST /api/unsplash/track — pingează endpoint-ul de „download" al Unsplash.
 *
 * DE CE există această rută:
 * Unsplash OBLIGĂ apelarea endpoint-ului `links.download_location` la prima
 * folosire reală a unei imagini (hover prelungit, click, share). Apelul NU
 * consumă rate-limit dar nerespectarea poate duce la blocarea aplicației.
 *
 * Apelul cere autentificare cu „Client-ID <ACCESS_KEY>". Cheia stă în
 * `UNSPLASH_ACCESS_KEY` (server-only), deci nu putem pinga direct din browser
 * fără să o expunem. Această rută e un proxy subțire: clientul îi trimite
 * `downloadLocation`, ea îl pingează cu cheia atașată.
 *
 * Body cerut (JSON):
 *   { "downloadLocation": "https://api.unsplash.com/photos/.../download?ixid=..." }
 *
 * Răspuns: 204 No Content la succes, 400 dacă input-ul e invalid, 502 dacă
 * Unsplash răspunde cu eroare. Nu propagăm body-ul lor — clientul oricum nu
 * are nevoie de el.
 */

import { NextResponse } from "next/server"
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit"

/** Validăm că URL-ul vine chiar de pe domeniul Unsplash, ca să nu fim folosiți
 *  ca proxy generic pentru orice request. */
const UNSPLASH_HOST = "api.unsplash.com"

export async function POST(request: Request) {
  // Rate limit generos: un user care navighează prin board poate trigerui
  // legitim multe pingări (dar dedup-ul din hook le ține în jos).
  const limit = await checkRateLimit(request, "unsplash-track", 60, 60)
  if (!limit.ok) return rateLimitResponse(limit)

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const downloadLocation = (body as any)?.downloadLocation
  if (typeof downloadLocation !== "string" || !downloadLocation) {
    return NextResponse.json(
      { error: "Missing downloadLocation" },
      { status: 400 },
    )
  }

  // Refuz orice URL care nu e către api.unsplash.com — vezi nota de mai sus.
  let url: URL
  try {
    url = new URL(downloadLocation)
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 })
  }
  if (url.host !== UNSPLASH_HOST) {
    return NextResponse.json({ error: "Forbidden host" }, { status: 400 })
  }

  const accessKey = process.env.UNSPLASH_ACCESS_KEY
  if (!accessKey) {
    // Fără cheie nu putem pinga — întoarcem 204 ca clientul să nu se blocheze.
    // (În producție vrei alertă pe asta, dar pentru dezvoltare e suficient.)
    return new NextResponse(null, { status: 204 })
  }

  try {
    // Unsplash documentează GET pe download_location (nu POST).
    const res = await fetch(downloadLocation, {
      method: "GET",
      headers: { Authorization: `Client-ID ${accessKey}` },
    })
    if (!res.ok) {
      return NextResponse.json(
        { error: "Unsplash returned " + res.status },
        { status: 502 },
      )
    }
  } catch {
    return NextResponse.json({ error: "Network error" }, { status: 502 })
  }

  return new NextResponse(null, { status: 204 })
}
