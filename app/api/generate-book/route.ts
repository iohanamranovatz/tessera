/**
 * POST /api/generate-book — generează datele unei cărți cu AI (Gemini).
 *
 * Asta rulează pe SERVER. Browserul trimite aici doar titlul (+ capitolul curent),
 * iar cheia GEMINI_API_KEY rămâne pe server — nu ajunge niciodată în client.
 *
 * Body cerut (JSON):
 *   { "title": "Crime and Punishment", "author"?: "...", "currentChapter"?: 3, "totalChapters"?: 6 }
 *
 * Răspuns: AiBookResult (book + characters + relationships), deja validat cu Zod.
 */

import { NextResponse } from "next/server"
import { z } from "zod"
import { generateBookData } from "@/lib/book-ai"

// Validăm CE PRIMIM de la browser (nu avem încredere oarbă în body).
const RequestSchema = z.object({
  title: z.string().min(1, "Titlul e obligatoriu."),
  author: z.string().optional(),
  currentChapter: z.number().int().positive().optional(),
  totalChapters: z.number().int().positive().optional(),
})

export async function POST(request: Request) {
  // 1. Citim și validăm body-ul.
  let input
  try {
    input = RequestSchema.parse(await request.json())
  } catch (err) {
    const message = err instanceof z.ZodError ? err.issues[0]?.message : "Body invalid."
    return NextResponse.json({ error: message }, { status: 400 })
  }

  // 2. Chemăm AI-ul. Dacă pică (cheie lipsă, limită, JSON stricat), prindem aici.
  try {
    const data = await generateBookData(input)
    return NextResponse.json(data)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Eroare necunoscută la AI."
    console.error("[/api/generate-book]", message)
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
