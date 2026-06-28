/**
 * Tessera — central data model.
 *
 * These types describe everything the app tracks for a book the user is reading:
 * the book itself, its characters, the relationships between them, and the
 * visual "fragments" shown on the collage board. They are the single source of
 * truth shared by the UI, by the hardcoded seed data, and (from Stage 2 on) by
 * the local IndexedDB store.
 */

/** A single colour from the dark-academia palette, written as a hex string (e.g. "#8a3020"). */
export type HexColor = string

/** Relationship categories. Each maps to an accent colour in the Relations graph. */
export type RelationshipType = "family" | "love" | "conflict" | "mentor"

/** Whether a character is alive in the story (as known up to the current chapter). */
export type CharacterStatus = "alive" | "dead" | "unknown"

/** How a character's avatar is drawn when no image is available. */
export type AvatarType = "initial" | "symbol" | "image"

/** The kind of thing a collage fragment represents. */
export type FragmentType = "object" | "quote" | "place" | "symbol" | "human"

/** Relative size of a fragment card on the board. */
export type FragmentSize = "small" | "medium" | "large"

/**
 * A book the user is reading and tracking.
 * `currentChapter` drives the anti-spoiler filter: anything revealed later is hidden.
 */
export interface Book {
  id: string
  title: string
  author: string
  year: number
  /** ISO-ish language name or code, e.g. "Russian". */
  language: string
  totalChapters: number
  /** How far the reader has progressed; used to hide later spoilers. */
  currentChapter: number
  /** Dominant colour of the book's palette, used for cover/theme accents. */
  coverColor: HexColor
}

/**
 * A character in a book. `nicknames` matters a lot for this app — readers of
 * Russian novels lose track of who "Mitenka" is, so we store every alias.
 */
export interface Character {
  id: string
  bookId: string
  name: string
  /** All aliases/diminutives, e.g. ["Mitya", "Mitka", "Mitenka"]. */
  nicknames: string[]
  /** Short spoiler-safe summary (kept truthful up to the book's currentChapter). */
  description: string
  /** Descriptive labels, e.g. ["passionate", "military", "unstable"]. */
  tags: string[]
  /** Accent colour from the character palette. */
  color: HexColor
  status: CharacterStatus
  /** First chapter the character appears in; used by the spoiler filter. */
  appearsInChapter: number
  /** How to render the avatar when there is no image. Defaults to "initial" in the UI. */
  avatarType?: AvatarType
}

/**
 * A directed link between two characters. `strength` controls line thickness in
 * the graph; `isSecret`/`revealedInChapter` let the spoiler filter hide links the
 * reader is not supposed to know yet.
 */
export interface Relationship {
  id: string
  bookId: string
  fromCharacterId: string
  toCharacterId: string
  type: RelationshipType
  /** Short visible label on the edge, e.g. "obsession". */
  label?: string
  /** Longer explanation, shown on hover/detail. */
  description?: string
  /** 1 = faint, 3 = central. Maps to edge thickness. */
  strength: 1 | 2 | 3
  /** True for hidden/hypothetical links (drawn dashed). */
  isSecret?: boolean
  /** Chapter at which a secret relationship becomes known. */
  revealedInChapter?: number
}

/**
 * Metadata for a fragment whose `content` is an image URL.
 *
 * We persist this so attribution (Unsplash) and licensing info survive a page
 * reload — when the user opens the book tomorrow, we still know that the photo
 * is from Unsplash and needs the photographer credit on screen.
 *
 * All fields optional: legacy fragments (created before STAGIUL 7.5) carry
 * `imageMeta === undefined`. Fragments from PD/CC0 sources without a known
 * author also have most fields blank — that's fine, they don't need credit.
 */
export interface FragmentImageMeta {
  /** Where the image came from (museum, Unsplash, etc.). */
  source?: "met" | "wikimedia" | "europeana" | "openverse" | "unsplash"
  /** Licence under which we display it. Drives whether we can cache, attribute, etc. */
  license?: "public-domain" | "cc0" | "unsplash-license"
  /** Author/artist/photographer name, for the credit line. */
  author?: string
  /** Link to the author's profile (e.g. Unsplash photographer page). */
  authorUrl?: string
  /** Link to the work's page on the source site (e.g. Met object page). */
  sourceUrl?: string
  /** If true, we MUST show a visible credit (Unsplash). PD/CC0 = false. */
  requiresAttribution?: boolean
  /**
   * Unsplash-only: the API URL we must ping when the image is "used"
   * (hover > 2s, click, share). Required by Unsplash terms.
   * Empty for any other source.
   */
  downloadLocation?: string
}

/**
 * A visual scrap pinned to the collage board (an object, a quote, a place, etc.),
 * associated with one character and positioned freely on the canvas.
 */
export interface Fragment {
  id: string
  bookId: string
  characterId: string
  type: FragmentType
  /** Either a short text (for quotes/symbols) or an image URL (for objects/places). */
  content: string
  /** Optional caption shown under the fragment. */
  label?: string
  /** Position on the board, in percent (0–100) plus a rotation in degrees. */
  position: { x: number; y: number; rotation: number }
  size: FragmentSize
  /** Image source/licence info — only present for image fragments (see FragmentImageMeta). */
  imageMeta?: FragmentImageMeta
}

/**
 * Top-level application state. From Stage 2 this is what we persist locally
 * (IndexedDB via Dexie). All entities are kept in flat arrays and linked by id.
 */
export interface AppState {
  /** The book currently open, or null on first launch before onboarding. */
  currentBookId: string | null
  books: Book[]
  characters: Character[]
  relationships: Relationship[]
  fragments: Fragment[]
}
