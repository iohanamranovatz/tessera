/**
 * One-off seed script: copies the hardcoded Karamazov data into Supabase.
 *
 * Run with:  npx tsx scripts/seed.ts
 *
 * It reads the Supabase URL + anon key from .env.local, then upserts the book,
 * characters, relationships and fragments (mapping camelCase -> snake_case).
 * Safe to run more than once (upsert = insert or update by id).
 */

import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { createClient } from "@supabase/supabase-js"
import { karamazovData } from "../data/karamazov"

// --- load .env.local manually (this script runs outside Next.js) ------------
function loadEnv(): Record<string, string> {
  const text = readFileSync(resolve(process.cwd(), ".env.local"), "utf8")
  const out: Record<string, string> = {}
  for (const line of text.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m) out[m[1]] = m[2].trim()
  }
  return out
}

const env = loadEnv()
const url = env.NEXT_PUBLIC_SUPABASE_URL
const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
if (!url || !key) {
  throw new Error("Missing Supabase env vars in .env.local")
}

const supabase = createClient(url, key)

async function main() {
  const { book, characters, relationships, fragments } = karamazovData

  // Order matters: books first (characters/relationships/fragments reference it).
  let res = await supabase.from("books").upsert({
    id: book.id,
    title: book.title,
    author: book.author,
    year: book.year,
    language: book.language,
    total_chapters: book.totalChapters,
    current_chapter: book.currentChapter,
    cover_color: book.coverColor,
  })
  if (res.error) throw res.error
  console.log("✓ book")

  res = await supabase.from("characters").upsert(
    characters.map((c) => ({
      id: c.id,
      book_id: c.bookId,
      name: c.name,
      nicknames: c.nicknames,
      description: c.description,
      tags: c.tags,
      color: c.color,
      status: c.status,
      appears_in_chapter: c.appearsInChapter,
      avatar_type: c.avatarType ?? null,
    })),
  )
  if (res.error) throw res.error
  console.log(`✓ ${characters.length} characters`)

  res = await supabase.from("relationships").upsert(
    relationships.map((r) => ({
      id: r.id,
      book_id: r.bookId,
      from_character_id: r.fromCharacterId,
      to_character_id: r.toCharacterId,
      type: r.type,
      label: r.label ?? null,
      description: r.description ?? null,
      strength: r.strength,
      is_secret: r.isSecret ?? false,
      revealed_in_chapter: r.revealedInChapter ?? null,
    })),
  )
  if (res.error) throw res.error
  console.log(`✓ ${relationships.length} relationships`)

  res = await supabase.from("fragments").upsert(
    fragments.map((f) => ({
      id: f.id,
      book_id: f.bookId,
      character_id: f.characterId,
      type: f.type,
      content: f.content,
      label: f.label ?? null,
      position: f.position,
      size: f.size,
    })),
  )
  if (res.error) throw res.error
  console.log(`✓ ${fragments.length} fragments`)

  console.log("Seed complete ✅")
}

main().catch((e) => {
  console.error("Seed failed:", e)
  process.exit(1)
})
