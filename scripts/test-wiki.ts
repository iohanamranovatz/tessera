/**
 * Test rapid pentru aducerea articolului Wikipedia (partea de "Retrieval" din RAG).
 *
 * Rulează cu:  npx tsx scripts/test-wiki.ts
 *       sau:   npx tsx scripts/test-wiki.ts "Frații Karamazov" "Dostoievski"
 *                                            ^titlu             ^autor (opțional)
 *
 * Nu cere nicio cheie (API-ul Wikipedia e public). Verifică doar că găsim
 * articolul și că textul arată rezonabil.
 */

import { fetchBookArticle } from "../lib/wikipedia"

async function main() {
  const [title = "Frații Karamazov", author] = process.argv.slice(2)

  console.log(`\n→ Caut pe Wikipedia: "${title}"${author ? ` de ${author}` : ""}...\n`)

  const article = await fetchBookArticle(title, author)

  if (!article) {
    console.log("⚠️  Niciun articol găsit (nici în ro, nici în en). RAG-ul va fi sărit.\n")
    return
  }

  console.log(`📄 Găsit: "${article.title}" (${article.language})`)
  console.log(`   ${article.url}`)
  console.log(`   lungime text: ${article.text.length} caractere\n`)
  console.log("--- primele 600 caractere ---")
  console.log(article.text.slice(0, 600))
  console.log("...\n")
  console.log("✅ Retrieval-ul Wikipedia merge.\n")
}

main().catch((e) => {
  console.error("\n❌ Test eșuat:", e instanceof Error ? e.message : e)
  process.exit(1)
})
