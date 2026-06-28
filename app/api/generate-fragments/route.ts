/**
 * POST /api/generate-fragments — caută imagini reale pentru personaje și întoarce
 * fragmente gata de salvat pe board.
 *
 * Rulează pe SERVER, ca să țină cheile de imagini (Europeana/Unsplash) ascunse.
 * Browserul trimite personajele (id + imageQueries) și book-ul; primește înapoi
 * o listă de Fragment (cu URL-uri de imagine) pe care le salvează el în Supabase.
 *
 * Body cerut (JSON):
 *   { "bookId": "...", "characters": [ { "id": "...", "imageQueries": ["...", "..."] } ] }
 */

import { NextResponse } from "next/server"
import { z } from "zod"
import { buildImageFragments } from "@/lib/images/character-fragments"
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit"

const RequestSchema = z.object({
  bookId: z.string().min(1, "bookId e obligatoriu."),
  characters: z
    .array(
      z.object({
        id: z.string().min(1),
        imageQueries: z.array(z.string()).default([]),
      }),
    )
    .default([]),
})

export async function POST(request: Request) {
  // 0. RATE LIMIT — protecție pentru chei API (Europeana, Unsplash).
  //    Limita e mai mare aici (20/min) fiindcă onboarding-ul cheamă o dată per
  //    personaj × 2 imagini, dar fiecare apel hits sursele externe în paralel.
  const limit = await checkRateLimit(request, "generate-fragments", 20, 60)
  if (!limit.ok) return rateLimitResponse(limit)

  // 1. Validăm body-ul.
  let input
  try {
    input = RequestSchema.parse(await request.json())
  } catch (err) {
    const message = err instanceof z.ZodError ? err.issues[0]?.message : "Body invalid."
    return NextResponse.json({ error: message }, { status: 400 })
  }

  // 2. Construim fragmentele (cheamă căutarea federată de imagini).
  try {
    const fragments = await buildImageFragments(input.characters, input.bookId)
    return NextResponse.json({ fragments })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Eroare la căutarea imaginilor."
    console.error("[/api/generate-fragments]", message)
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
