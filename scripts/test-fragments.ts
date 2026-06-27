/**
 * Test end-to-end (terminal) pentru 6.C.4 partea 1:
 *   AI generează personaje cu `imageQueries` → `buildImageFragments` caută imagini.
 *
 * Rulează cu:  npx tsx scripts/test-fragments.ts
 *       sau:   npx tsx scripts/test-fragments.ts "Crime and Punishment" "Dostoevsky" 5
 *
 * Cere GEMINI_API_KEY (pentru AI) și folosește cheile de imagini din .env.local.
 */

import { readFileSync } from "node:fs"
import { resolve } from "node:path"

function loadEnv(): void {
  try {
    const text = readFileSync(resolve(process.cwd(), ".env.local"), "utf8")
    for (const line of text.split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if (m) process.env[m[1]] = m[2].trim()
    }
  } catch {
    /* fără .env.local */
  }
}

loadEnv()

import { generateBookData } from "../lib/book-ai"
import { buildImageFragments } from "../lib/images/character-fragments"

async function main() {
  const [title = "The Brothers Karamazov", author = "Fyodor Dostoevsky", chapter] =
    process.argv.slice(2)
  const currentChapter = chapter ? Number(chapter) : undefined

  console.log(`\n→ 1. Generez cartea cu AI: "${title}"...\n`)
  const data = await generateBookData({ title, author, currentChapter })

  // Arătăm ce query-uri vizuale a propus AI-ul.
  console.log(`👤 ${data.characters.length} personaje + query-urile lor vizuale:`)
  for (const c of data.characters) {
    console.log(`   • ${c.name}: ${c.imageQueries.length ? c.imageQueries.join(" | ") : "(niciunul)"}`)
  }

  // Dăm fiecărui personaj un id fals (în aplicație vine din DB).
  const characters = data.characters.map((c) => ({
    id: `fake-${c.name}`,
    imageQueries: c.imageQueries,
  }))

  console.log(`\n→ 2. Caut imagini pentru fiecare query (poate dura puțin)...\n`)
  const fragments = await buildImageFragments(characters, "fake-book-id")

  console.log(`🖼️  ${fragments.length} fragmente cu imagine create:\n`)
  for (const f of fragments) {
    console.log(`   • [${f.size}] "${f.label}"`)
    console.log(`     pers: ${f.characterId} @ (${Math.round(f.position.x)}, ${Math.round(f.position.y)})`)
    console.log(`     ${f.content}`)
    console.log("")
  }

  console.log("✅ AI → query-uri → imagini reale. Gata pentru UI (6.C.4.3).\n")
}

main().catch((e) => {
  console.error("\n❌ Test eșuat:", e instanceof Error ? e.message : e)
  process.exit(1)
})
