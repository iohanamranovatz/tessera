/**
 * Hardcoded seed data for *Maitreyi* (Mircea Eliade, 1933).
 *
 * The second reference dataset, used to test Tessera's multi-book features
 * (library, book switcher). The novel is told as the journal of Allan, a young
 * European engineer in Calcutta who falls in love with Maitreyi, the daughter
 * of his Bengali host. Everything here is kept spoiler-safe up to chapter 7.
 */

import type { Book, Character, Relationship, Fragment } from "@/types"

export const MAITREYI_BOOK_ID = "book-maitreyi"

export const maitreyiBook: Book = {
  id: MAITREYI_BOOK_ID,
  title: "Maitreyi",
  author: "Mircea Eliade",
  year: 1933,
  language: "Romanian",
  totalChapters: 15,
  currentChapter: 7,
  coverColor: "#6a4a3a",
}

export const maitreyiCharacters: Character[] = [
  {
    id: "mai-char-allan",
    bookId: MAITREYI_BOOK_ID,
    name: "Allan",
    nicknames: ["the engineer"],
    description:
      "The narrator: a young European engineer working in Calcutta who is taken in as a guest in the Sen household. Rational and ambitious at first, he is slowly drawn into a love he does not fully understand.",
    tags: ["European", "rational", "ambitious", "outsider"],
    color: "#2a4a5a",
    status: "alive",
    appearsInChapter: 1,
    avatarType: "initial",
  },
  {
    id: "mai-char-maitreyi",
    bookId: MAITREYI_BOOK_ID,
    name: "Maitreyi Devi",
    nicknames: ["Maitreyi"],
    description:
      "The elder daughter of Narendra Sen — sixteen, a gifted poet already admired in literary circles. Mysterious and spontaneous, her world of ritual and feeling is utterly foreign to Allan.",
    tags: ["poet", "spontaneous", "passionate", "mystical"],
    color: "#8a3020",
    status: "alive",
    appearsInChapter: 1,
    avatarType: "initial",
  },
  {
    id: "mai-char-narendra",
    bookId: MAITREYI_BOOK_ID,
    name: "Narendra Sen",
    nicknames: ["Sen", "the engineer Sen"],
    description:
      "A respected Bengali engineer and Allan's employer, who invites him to live in the family home and treats him almost as a son — with plans Allan does not suspect.",
    tags: ["patriarch", "cultivated", "hospitable", "proud"],
    color: "#3a2820",
    status: "alive",
    appearsInChapter: 1,
    avatarType: "initial",
  },
  {
    id: "mai-char-chabu",
    bookId: MAITREYI_BOOK_ID,
    name: "Chabù",
    nicknames: [],
    description:
      "Maitreyi's younger sister, a candid and dreamy child who attaches herself to Allan and watches the adults with unsettling clarity.",
    tags: ["child", "candid", "dreamy", "sensitive"],
    color: "#8a6a28",
    status: "alive",
    appearsInChapter: 2,
    avatarType: "initial",
  },
]

export const maitreyiRelationships: Relationship[] = [
  {
    id: "mai-rel-allan-maitreyi",
    bookId: MAITREYI_BOOK_ID,
    fromCharacterId: "mai-char-allan",
    toCharacterId: "mai-char-maitreyi",
    type: "love",
    label: "forbidden love",
    description:
      "A slow-burning, all-consuming love that crosses the boundaries of culture, family and class — and cannot be lived openly.",
    strength: 3,
  },
  {
    id: "mai-rel-narendra-maitreyi",
    bookId: MAITREYI_BOOK_ID,
    fromCharacterId: "mai-char-narendra",
    toCharacterId: "mai-char-maitreyi",
    type: "family",
    label: "father & daughter",
    description:
      "Narendra Sen adores and shelters his elder daughter, holding firm ideas about how — and to whom — she must one day be given.",
    strength: 3,
  },
  {
    id: "mai-rel-narendra-allan",
    bookId: MAITREYI_BOOK_ID,
    fromCharacterId: "mai-char-narendra",
    toCharacterId: "mai-char-allan",
    type: "mentor",
    label: "host & protector",
    description:
      "Sen brings Allan into his home and treats him as family, becoming both his employer and a kind of adoptive father.",
    strength: 2,
  },
  {
    id: "mai-rel-maitreyi-chabu",
    bookId: MAITREYI_BOOK_ID,
    fromCharacterId: "mai-char-maitreyi",
    toCharacterId: "mai-char-chabu",
    type: "family",
    label: "sisters",
    description:
      "The two sisters share the inner world of the house; Chabù sees more of Maitreyi's heart than the adults realise.",
    strength: 2,
  },
  {
    id: "mai-rel-chabu-allan",
    bookId: MAITREYI_BOOK_ID,
    fromCharacterId: "mai-char-chabu",
    toCharacterId: "mai-char-allan",
    type: "love",
    label: "hidden affection",
    description:
      "Chabù forms a quiet, childlike attachment to Allan that no one quite acknowledges.",
    strength: 1,
    isSecret: true,
    revealedInChapter: 5,
  },
]

export const maitreyiFragments: Fragment[] = [
  // Maitreyi
  {
    id: "mai-frag-garland",
    bookId: MAITREYI_BOOK_ID,
    characterId: "mai-char-maitreyi",
    type: "object",
    content: "garland",
    label: "Flower Garland",
    position: { x: 8, y: 7, rotation: -4 },
    size: "medium",
  },
  {
    id: "mai-frag-verses",
    bookId: MAITREYI_BOOK_ID,
    characterId: "mai-char-maitreyi",
    type: "quote",
    content: "her notebook of Bengali verses",
    position: { x: 34, y: 10, rotation: 3 },
    size: "medium",
  },
  // Allan
  {
    id: "mai-frag-house",
    bookId: MAITREYI_BOOK_ID,
    characterId: "mai-char-allan",
    type: "place",
    content: "house",
    label: "The Sen House, Bhowanipore",
    position: { x: 62, y: 8, rotation: 5 },
    size: "medium",
  },
  {
    id: "mai-frag-journal",
    bookId: MAITREYI_BOOK_ID,
    characterId: "mai-char-allan",
    type: "object",
    content: "journal",
    label: "Allan's Journal",
    position: { x: 18, y: 46, rotation: -6 },
    size: "small",
  },
  // Narendra Sen
  {
    id: "mai-frag-library",
    bookId: MAITREYI_BOOK_ID,
    characterId: "mai-char-narendra",
    type: "object",
    content: "books",
    label: "Sen's Library",
    position: { x: 70, y: 44, rotation: 4 },
    size: "medium",
  },
  // Chabù
  {
    id: "mai-frag-flower",
    bookId: MAITREYI_BOOK_ID,
    characterId: "mai-char-chabu",
    type: "symbol",
    content: "✿",
    position: { x: 44, y: 64, rotation: -2 },
    size: "small",
  },
]

/** Everything bundled, ready to seed the store. */
export const maitreyiData = {
  book: maitreyiBook,
  characters: maitreyiCharacters,
  relationships: maitreyiRelationships,
  fragments: maitreyiFragments,
}
