/**
 * Test rapid pentru integrarea AI, din terminal.
 *
 * Rulează cu:  npx tsx scripts/test-ai.ts
 *       sau:   npx tsx scripts/test-ai.ts "Crime and Punishment" "Dostoevsky" 3
 *                                          ^titlu                 ^autor       ^capitol
 *
 * Cheamă exact aceeași funcție ca ruta /api (generateBookData), deci dacă merge
 * aici, merge și în aplicație. Nu costă nimic (tier gratuit Gemini).
 */

import { readFileSync } from "node:fs"
import { resolve } from "node:path"

// --- încarcă .env.local manual (scriptul rulează în afara Next.js) -----------
// Punem valorile direct în process.env, ca lib/gemini.ts (care citește
// process.env.GEMINI_API_KEY) să le vadă fără modificări.
function loadEnv(): void {
  const text = readFileSync(resolve(process.cwd(), ".env.local"), "utf8")
  for (const line of text.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m) process.env[m[1]] = m[2].trim()
  }
}

loadEnv()

// Importăm DUPĂ loadEnv. (Importul e static, dar lib/gemini.ts citește cheia
// abia când e apelat, deci e ok.)
import { generateBookData } from "../lib/book-ai"

async function main() {
  // Argumente din linia de comandă, cu valori implicite pentru un test rapid.
  const [title = "The Brothers Karamazov", author = "Fyodor Dostoevsky", chapter] = process.argv.slice(2)
  const currentChapter = chapter ? Number(chapter) : undefined

  console.log(`\n→ Generez cu AI: "${title}"${author ? ` de ${author}` : ""}`)
  if (currentChapter) console.log(`  (cititorul e la capitolul ${currentChapter})`)
  console.log("  ...aștept răspunsul de la Gemini...\n")

  const data = await generateBookData({ title, author, currentChapter })

  console.log(`📕 ${data.book.title} — ${data.book.author} (${data.book.year}), ${data.book.language}`)
  console.log(`   copertă: ${data.book.coverColor}, ${data.book.totalChapters} capitole\n`)

  console.log(`👤 ${data.characters.length} personaje:`)
  for (const c of data.characters) {
    const nick = c.nicknames.length ? ` [${c.nicknames.join(", ")}]` : ""
    console.log(`   • ${c.name}${nick} — ${c.status}, cap. ${c.appearsInChapter} — ${c.color}`)
  }

  console.log(`\n🔗 ${data.relationships.length} relații:`)
  for (const r of data.relationships) {
    const secret = r.isSecret ? " (secret)" : ""
    console.log(`   • ${r.fromName} —[${r.type}/${r.strength}]→ ${r.toName}${secret}`)
  }

  console.log("\n✅ Răspunsul respectă schema. Integrarea AI merge.\n")
}

main().catch((e) => {
  console.error("\n❌ Test eșuat:", e instanceof Error ? e.message : e)
  process.exit(1)
})
