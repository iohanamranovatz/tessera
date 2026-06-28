/**
 * book-ai.ts — logica de domeniu pentru generarea unei cărți cu AI.
 *
 * Aici stă tot ce ține de "cum cerem datele unei cărți de la Gemini":
 *   1. SCHEMA (Zod) — forma exactă pe care AI-ul TREBUIE să o respecte.
 *   2. PROMPT-UL — instrucțiunile date modelului.
 *   3. generateBookData() — leagă cele două: cheamă Gemini și validează răspunsul.
 *
 * De ce separat de `lib/gemini.ts`: gemini.ts e "țeava" generală (vorbește cu API-ul),
 * iar aici e specificul Tessera. Atât ruta /api cât și scriptul de test folosesc
 * `generateBookData`, deci logica e scrisă o singură dată.
 *
 * IMPORTANT — ce NU cerem AI-ului: `id`-uri și `bookId`. Acelea le generăm noi când
 * salvăm (cu crypto.randomUUID), ca să nu existe coliziuni. AI-ul leagă relațiile
 * prin NUMELE personajelor (`fromName` / `toName`), nu prin id-uri inventate.
 */

import { z } from "zod"
import { generateJson } from "@/lib/gemini"
import { fetchBookArticle, type WikipediaArticle } from "@/lib/wikipedia"

// ---------------------------------------------------------------------------
// 1. SCHEMA — exact forma validă. Dacă AI-ul deviază, Zod aruncă eroare clară.
// ---------------------------------------------------------------------------

/** Paleta dark-academia permisă pentru accentul fiecărui personaj/copertă. */
export const PALETTE = [
  "#8a3020", // roșu
  "#2a4a5a", // albastru-rece
  "#8a6a28", // auriu
  "#3a2820", // maro-închis
  "#6a5836", // dim brown
  "#8a4a5a", // prune
  "#6a6a3a", // oliv
  "#5a4a3a", // taupe
] as const

const AiCharacterSchema = z.object({
  name: z.string().min(1),
  /** Porecle/diminutive — esențiale la romanele rusești ("Mitya", "Mitenka"). */
  nicknames: z.array(z.string()).default([]),
  description: z.string().min(1),
  tags: z.array(z.string()).default([]),
  /** Trebuie să fie un hex din PALETTE. */
  color: z.string(),
  status: z.enum(["alive", "dead", "unknown"]),
  /** Primul capitol în care apare personajul (pentru filtrul anti-spoiler). */
  appearsInChapter: z.number().int().positive(),
  /** 2-3 căutări vizuale (în engleză) pentru imagini de atmosferă asociate
   *  personajului — obiecte, locuri, portrete de epocă. NU numele personajului.
   *  Le folosim la 6.C pentru a aduce imagini reale pe board. */
  imageQueries: z.array(z.string()).default([]),
})

const AiRelationshipSchema = z.object({
  /** Numele exact al personajului-sursă (trebuie să existe în lista de characters). */
  fromName: z.string().min(1),
  /** Numele exact al personajului-țintă. */
  toName: z.string().min(1),
  type: z.enum(["family", "love", "conflict", "mentor"]),
  label: z.string().optional(),
  description: z.string().optional(),
  /** 1 = slabă, 3 = centrală (grosimea muchiei în graf). */
  strength: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  /** true = relație ascunsă/încă necunoscută cititorului (muchie punctată). */
  isSecret: z.boolean().optional(),
  revealedInChapter: z.number().int().positive().optional(),
})

const AiBookSchema = z.object({
  book: z.object({
    title: z.string().min(1),
    author: z.string().min(1),
    year: z.number().int(),
    /** Limba originală, ex: "Russian", "Romanian". */
    language: z.string().min(1),
    totalChapters: z.number().int().positive(),
    coverColor: z.string(),
  }),
  // Poate fi goală: dacă AI-ul nu cunoaște cartea, întoarce [] (nu inventează).
  characters: z.array(AiCharacterSchema).default([]),
  relationships: z.array(AiRelationshipSchema).default([]),
})

/** Forma TypeScript a răspunsului AI (dedusă automat din schema Zod de mai sus). */
export type AiBookResult = z.infer<typeof AiBookSchema> & {
  /** True dacă am refuzat să generăm personaje pentru că anul publicării
   *  e prea recent (>= COPYRIGHT_CUTOFF_YEAR). Vezi nota din generateBookData. */
  restrictedByCopyright?: boolean
}

/**
 * An-cutoff pentru restricția pe copyright.
 * Regula 70 ani post-mortem: o carte din 1954 a cărei autor a murit chiar în
 * anul publicării ar intra în Public Domain în 2025. Cu marja de siguranță,
 * tăiem la 1955 — orice carte de DUPĂ acest an primește metadate de la AI,
 * dar NU și personaje/relații (le poate adăuga userul manual).
 *
 * De ce nu apelăm Gemini deloc pentru cărți recente? Pentru că avem nevoie de
 * AN ca să decidem, iar anul vine TOT de la AI. Soluția: cerem AI-ul, primim
 * anul, dacă e prea recent aruncăm personajele înainte să le afișăm. Pierdem
 * un singur call Gemini pe carte recentă, dar UI-ul nu salvează nimic
 * copyrightat. Pe viitor (dacă vrem să economisim), userul poate completa
 * anul manual și pre-check-ul s-ar putea face fără AI.
 */
export const COPYRIGHT_CUTOFF_YEAR = 1955

// ---------------------------------------------------------------------------
// 2. PROMPT — instrucțiunile pentru model.
// ---------------------------------------------------------------------------

/** Ce-i dăm noi funcției: ce carte și unde a ajuns cititorul. */
export interface GenerateBookInput {
  title: string
  author?: string
  /** Capitolul la care e cititorul — filtrul anti-spoiler se bazează pe el. */
  currentChapter?: number
  /** Numărul total de capitole, dacă userul îl știe (ajută AI-ul să-l estimeze). */
  totalChapters?: number
}

/** Rolul + regulile fixe pe care AI-ul le respectă mereu (mesajul de sistem). */
const SYSTEM_INSTRUCTION = `Ești un asistent literar pentru aplicația Tessera, un moodboard pentru cititori de romane mari (Dostoievski, Tolstoi, Márquez, Eliade).
Sarcina ta: pentru o carte dată, întorci personajele principale și relațiile dintre ele.

Reguli ABSOLUTE:
- Răspunzi DOAR cu JSON valid care respectă schema cerută. Fără markdown, fără \`\`\`, fără text în jur.
- Dacă primești un articol Wikipedia despre carte, te bazezi STRICT pe el plus cunoștințele tale generale. Nu contrazice articolul și nu inventa personaje care nu apar nicăieri.
- Dacă NU primești articol și nici nu cunoști cartea, întorci o listă goală de characters (NU inventezi personaje).
- ATENȚIE LA SPOILERE: articolul Wikipedia descrie de obicei TOATĂ intriga, inclusiv finalul. Respectă întotdeauna limita de capitol cerută mai jos — NU folosi din articol nimic ce se întâmplă după capitolul curent al cititorului.
- "color" și "coverColor" sunt OBLIGATORIU una dintre valorile hex din paleta dată. Atât. Nicio altă culoare.
- "type" la relații e EXACT una dintre: family, love, conflict, mentor.
- "strength" e 1, 2 sau 3 (număr, nu text).
- "fromName"/"toName" trebuie să fie identice cu un "name" din lista characters.
- Descrierile sunt scurte (1-2 propoziții), în engleză, pe un ton sobru de manuscris vechi.
- "imageQueries": pentru FIECARE personaj, dă 2-3 căutări vizuale scurte în engleză pentru imagini de ATMOSFERĂ (obiecte, locuri, portrete sau picturi de epocă) care evocă personajul. Descrie LUCRURI/LOCURI/ATMOSFERĂ, NU numele personajului (nu vom găsi tablouri cu el). Ex bune: "worn military greatcoat", "19th century Saint Petersburg snowy street", "old monastery candlelight". Preferă termeni care există în colecții de muzeu.
- "year": EXACT anul PRIMEI publicări originale a cărții (nu al reeditării, nu al traducerii). Ex: "Crime and Punishment" → 1866, NU 2020 (data unei reeditări recente). Acest câmp e folosit ca filtru de copyright.`

/** Construiește mesajul concret (user) pentru cartea cerută. */
function buildPrompt(input: GenerateBookInput, article: WikipediaArticle | null): string {
  const { title, author, currentChapter, totalChapters } = input

  // Filtru anti-spoiler. Subliniem că se aplică și informațiilor din articol.
  const spoilerNote =
    currentChapter && currentChapter > 0
      ? `Cititorul e la capitolul ${currentChapter}. NU include personaje care apar abia după acest capitol și NU dezvălui evenimente/relații de după el — nici măcar dacă articolul Wikipedia le menționează. Pentru relațiile încă necunoscute cititorului la capitolul ${currentChapter}, pune "isSecret": true și "revealedInChapter".`
      : `Presupune că cititorul abia a început cartea; rămâi la informații de la începutul cărții.`

  // Blocul RAG: articolul Wikipedia ca sursă de încredere. Dacă lipsește, îi
  // spunem explicit AI-ului să se bazeze pe cunoștințele lui (fără să inventeze).
  const articleBlock = article
    ? `Sursă de încredere — articol Wikipedia (${article.language}) despre carte. Bazează-te în primul rând pe el:
"""
${article.text}
"""`
    : `(Nu am găsit un articol Wikipedia despre această carte. Folosește doar ce știi sigur; dacă nu cunoști cartea, întoarce characters: [].)`

  return `Carte: "${title}"${author ? ` de ${author}` : ""}.
${totalChapters ? `Are aproximativ ${totalChapters} capitole.` : ""}

${articleBlock}

${spoilerNote}

Paleta de culori permisă (alege "color" și "coverColor" DOAR de aici):
${PALETTE.join(", ")}

Întoarce un JSON cu această formă exactă:
{
  "book": { "title", "author", "year" (număr), "language", "totalChapters" (număr), "coverColor" },
  "characters": [ { "name", "nicknames": [], "description", "tags": [], "color", "status": "alive"|"dead"|"unknown", "appearsInChapter" (număr), "imageQueries": ["...", "..."] } ],
  "relationships": [ { "fromName", "toName", "type": "family"|"love"|"conflict"|"mentor", "label", "description", "strength": 1|2|3, "isSecret"?, "revealedInChapter"? } ]
}

Dă 5-10 personaje principale și relațiile importante dintre ele.`
}

// ---------------------------------------------------------------------------
// 3. generateBookData — cheamă Gemini și validează răspunsul.
// ---------------------------------------------------------------------------

/**
 * Generează datele unei cărți cu AI și le validează cu Zod.
 * Aruncă eroare dacă AI-ul a returnat ceva ce nu respectă schema —
 * mai bine să pice aici, zgomotos, decât să salvăm date stricate.
 */
export async function generateBookData(input: GenerateBookInput): Promise<AiBookResult> {
  // PASUL RAG: întâi aducem articolul Wikipedia (sau null dacă nu există).
  // Nu blocăm generarea dacă lipsește — AI-ul cade pe cunoștințele lui.
  const article = await fetchBookArticle(input.title, input.author)

  const raw = (await generateJson({
    prompt: buildPrompt(input, article),
    systemInstruction: SYSTEM_INSTRUCTION,
    temperature: 0.4,
  })) as Record<string, unknown>

  // Parsare REZISTENTĂ: cartea trebuie să fie validă (e mică, AI-ul rar greșește),
  // dar pentru personaje și relații păstrăm DOAR elementele care trec validarea.
  // Așa, o singură deviere a AI-ului (ex: type "friendship", inexistent în enum)
  // nu mai dărâmă întreaga generare — pierdem doar elementul respectiv.
  const book = AiBookSchema.shape.book.parse(raw.book)
  const characters = keepValid(raw.characters, AiCharacterSchema)
  const relationships = keepValid(raw.relationships, AiRelationshipSchema)

  // FILTRU DE COPYRIGHT (vezi COPYRIGHT_CUTOFF_YEAR de mai sus).
  // Cartea e prea recentă → ținem metadatele (titlu/autor/an = fapte, nu sunt
  // copyrightate), dar aruncăm personajele și relațiile (acestea ar fi
  // derivative din intriga protejată). Userul le va adăuga manual.
  if (book.year >= COPYRIGHT_CUTOFF_YEAR) {
    return { book, characters: [], relationships: [], restrictedByCopyright: true }
  }

  return { book, characters, relationships }
}

/** Validează fiecare element dintr-un array și păstrează doar pe cele valide. */
function keepValid<T>(value: unknown, schema: z.ZodType<T>): T[] {
  if (!Array.isArray(value)) return []
  const out: T[] = []
  for (const item of value) {
    const result = schema.safeParse(item)
    if (result.success) out.push(result.data)
  }
  return out
}
