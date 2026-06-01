"use client"

/**
 * Data-access hooks for Tessera.
 *
 * For now these read from the hardcoded seed data in `data/karamazov.ts`.
 * Later (persistence stage) the SAME function signatures will be backed by
 * Supabase, so components that use these hooks won't need to change.
 */

import { karamazovData } from "@/data/karamazov"
import type { Book, Character, Fragment } from "@/types"

/** Returns the book with the given id, or undefined if not found. */
export function useBook(bookId: string): Book | undefined {
  return karamazovData.book.id === bookId ? karamazovData.book : undefined
}

/** Returns all characters that belong to the given book. */
export function useCharacters(bookId: string): Character[] {
  return karamazovData.characters.filter((c) => c.bookId === bookId)
}

/** Returns all visual fragments that belong to the given book. */
export function useFragments(bookId: string): Fragment[] {
  return karamazovData.fragments.filter((f) => f.bookId === bookId)
}

/** Looks up a single character by id (handy for tooltips/film colour). */
export function useCharacter(characterId: string | undefined): Character | undefined {
  if (!characterId) return undefined
  return karamazovData.characters.find((c) => c.id === characterId)
}
