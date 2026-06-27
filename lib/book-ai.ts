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
export type AiBookResult = z.infer<typeof AiBookSchema>

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
- Te bazezi pe cunoștințele tale despre carte. Dacă nu cunoști cartea, întorci o listă goală de characters (NU inventezi personaje).
- "color" și "coverColor" sunt OBLIGATORIU una dintre valorile hex din paleta dată. Atât. Nicio altă culoare.
- "type" la relații e EXACT una dintre: family, love, conflict, mentor.
- "strength" e 1, 2 sau 3 (număr, nu text).
- "fromName"/"toName" trebuie să fie identice cu un "name" din lista characters.
- Descrierile sunt scurte (1-2 propoziții), în engleză, pe un ton sobru de manuscris vechi.`

/** Construiește mesajul concret (user) pentru cartea cerută. */
function buildPrompt(input: GenerateBookInput): string {
  const { title, author, currentChapter, totalChapters } = input

  // Filtru anti-spoiler de bază. (Versiunea completă, cu Wikipedia, vine la 6.B.)
  const spoilerNote =
    currentChapter && currentChapter > 0
      ? `Cititorul e la capitolul ${currentChapter}. NU include personaje care apar abia după acest capitol și NU dezvălui evenimente/relații de după el. Pentru relațiile încă necunoscute cititorului la capitolul ${currentChapter}, pune "isSecret": true și "revealedInChapter".`
      : `Presupune că cititorul abia a început cartea; rămâi la informații de la începutul cărții.`

  return `Carte: "${title}"${author ? ` de ${author}` : ""}.
${totalChapters ? `Are aproximativ ${totalChapters} capitole.` : ""}
${spoilerNote}

Paleta de culori permisă (alege "color" și "coverColor" DOAR de aici):
${PALETTE.join(", ")}

Întoarce un JSON cu această formă exactă:
{
  "book": { "title", "author", "year" (număr), "language", "totalChapters" (număr), "coverColor" },
  "characters": [ { "name", "nicknames": [], "description", "tags": [], "color", "status": "alive"|"dead"|"unknown", "appearsInChapter" (număr) } ],
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
  const raw = await generateJson({
    prompt: buildPrompt(input),
    systemInstruction: SYSTEM_INSTRUCTION,
    temperature: 0.4,
  })

  // .parse aruncă o eroare descriptivă dacă forma nu se potrivește.
  return AiBookSchema.parse(raw)
}
