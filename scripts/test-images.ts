/**
 * Test rapid pentru căutarea federată de imagini (Stagiul 6.C).
 *
 * Rulează cu:  npx tsx scripts/test-images.ts
 *       sau:   npx tsx scripts/test-images.ts "Russian winter troika"
 *                                              ^query-ul vizual de căutat
 *
 * Met, Wikimedia și Openverse sunt publice (fără cheie). Europeana intră doar dacă
 * ai EUROPEANA_API_KEY în .env.local. Deschide URL-urile în browser ca să vezi
 * imaginile.
 */

import { readFileSync } from "node:fs"
import { resolve } from "node:path"

// Încarcă .env.local manual (scriptul rulează în afara Next.js), ca europeana.ts
// să vadă EUROPEANA_API_KEY. Dacă fișierul lipsește, mergem mai departe fără el.
function loadEnv(): void {
  try {
    const text = readFileSync(resolve(process.cwd(), ".env.local"), "utf8")
    for (const line of text.split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if (m) process.env[m[1]] = m[2].trim()
    }
  } catch {
    // fără .env.local — Europeana va fi sărită, restul surselor merg.
  }
}

loadEnv()

import { searchImages } from "../lib/images"

async function main() {
  const query = process.argv.slice(2).join(" ") || "19th century portrait of a man"

  console.log(`\n→ Caut imagini pentru: "${query}"...\n`)

  const results = await searchImages(query)

  if (results.length === 0) {
    console.log("⚠️  Niciun rezultat. Încearcă un query mai general (ex: 'old book').\n")
    return
  }

  console.log(`🖼️  ${results.length} imagini (top, deduplicate, ≥800px unde se știe):\n`)
  for (const img of results) {
    const dims = img.width ? `${img.width}×${img.height}px` : "dimensiune necunoscută"
    const attr = img.requiresAttribution ? " ⚠️ atribuire obligatorie" : ""
    console.log(`   [${img.source}]${attr} ${img.title ?? "(fără titlu)"} — ${dims}`)
    if (img.author) console.log(`      autor: ${img.author}`)
    if (img.year) console.log(`      an: ${img.year}`)
    console.log(`      ${img.url}`)
    console.log("")
  }

  console.log("✅ Căutarea federată merge. Deschide URL-urile ca să vezi imaginile.\n")
}

main().catch((e) => {
  console.error("\n❌ Test eșuat:", e instanceof Error ? e.message : e)
  process.exit(1)
})
