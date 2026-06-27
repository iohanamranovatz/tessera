"use client"

/**
 * Data-access hooks for Tessera — now backed by Supabase.
 *
 * Reading from a database is asynchronous, so each hook returns:
 *   { data, loading }   (and logs errors to the console)
 *
 * The hooks also translate the database's snake_case columns into the
 * camelCase shape used by the TypeScript model in `types/`.
 */

import { useCallback, useEffect, useState } from "react"
import { supabase } from "@/lib/supabase/client"
import type { Book, Character, Fragment, Relationship } from "@/types"

// --- row -> model mappers ---------------------------------------------------

function mapBook(row: Record<string, any>): Book {
  return {
    id: row.id,
    title: row.title,
    author: row.author,
    year: row.year,
    language: row.language,
    totalChapters: row.total_chapters,
    currentChapter: row.current_chapter,
    coverColor: row.cover_color,
  }
}

function mapCharacter(row: Record<string, any>): Character {
  return {
    id: row.id,
    bookId: row.book_id,
    name: row.name,
    nicknames: row.nicknames ?? [],
    description: row.description ?? "",
    tags: row.tags ?? [],
    color: row.color,
    status: row.status,
    appearsInChapter: row.appears_in_chapter,
    avatarType: row.avatar_type ?? undefined,
  }
}

function mapFragment(row: Record<string, any>): Fragment {
  return {
    id: row.id,
    bookId: row.book_id,
    characterId: row.character_id,
    type: row.type,
    content: row.content,
    label: row.label ?? undefined,
    position: row.position,
    size: row.size,
  }
}

function mapRelationship(row: Record<string, any>): Relationship {
  return {
    id: row.id,
    bookId: row.book_id,
    fromCharacterId: row.from_character_id,
    toCharacterId: row.to_character_id,
    type: row.type,
    label: row.label ?? undefined,
    description: row.description ?? undefined,
    strength: row.strength,
    isSecret: row.is_secret ?? undefined,
    revealedInChapter: row.revealed_in_chapter ?? undefined,
  }
}

// --- hooks ------------------------------------------------------------------

/** Loads a single book by id. */
export function useBook(bookId: string) {
  const [data, setData] = useState<Book | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    setLoading(true)
    supabase
      .from("books")
      .select("*")
      .eq("id", bookId)
      .single()
      .then(({ data, error }) => {
        if (!active) return
        if (error) console.error("useBook:", error.message)
        setData(data ? mapBook(data) : null)
        setLoading(false)
      })
    return () => {
      active = false
    }
  }, [bookId])

  return { data, loading }
}

/** Loads every book in the library (for the book switcher). */
export function useBooks() {
  const [data, setData] = useState<Book[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    setLoading(true)
    supabase
      .from("books")
      .select("*")
      .order("title")
      .then(({ data, error }) => {
        if (!active) return
        if (error) console.error("useBooks:", error.message)
        setData((data ?? []).map(mapBook))
        setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  return { data, loading }
}

/** Loads all characters for a book. Returns `refetch` to reload on demand. */
export function useCharacters(bookId: string) {
  const [data, setData] = useState<Character[]>([])
  const [loading, setLoading] = useState(true)

  // Reusable loader so we can both run it on mount AND call it again after edits.
  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from("characters")
      .select("*")
      .eq("book_id", bookId)
    if (error) console.error("useCharacters:", error.message)
    setData((data ?? []).map(mapCharacter))
    setLoading(false)
  }, [bookId])

  useEffect(() => {
    void load()
  }, [load])

  return { data, loading, refetch: load }
}

/** Loads all relationships for a book. */
export function useRelationships(bookId: string) {
  const [data, setData] = useState<Relationship[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    setLoading(true)
    supabase
      .from("relationships")
      .select("*")
      .eq("book_id", bookId)
      .then(({ data, error }) => {
        if (!active) return
        if (error) console.error("useRelationships:", error.message)
        setData((data ?? []).map(mapRelationship))
        setLoading(false)
      })
    return () => {
      active = false
    }
  }, [bookId])

  return { data, loading }
}

/** Loads all visual fragments for a book. Returns `refetch` to reload on demand. */
export function useFragments(bookId: string) {
  const [data, setData] = useState<Fragment[]>([])
  const [loading, setLoading] = useState(true)

  // Reusable loader so we can both run it on mount AND call it again after adding.
  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from("fragments")
      .select("*")
      .eq("book_id", bookId)
    if (error) console.error("useFragments:", error.message)
    setData((data ?? []).map(mapFragment))
    setLoading(false)
  }, [bookId])

  useEffect(() => {
    void load()
  }, [load])

  return { data, loading, refetch: load }
}

/**
 * Inserts a new fragment into Supabase.
 * Throws on error so the caller can show a message.
 */
export async function createFragment(fragment: Fragment): Promise<void> {
  const { error } = await supabase.from("fragments").insert({
    id: fragment.id,
    book_id: fragment.bookId,
    character_id: fragment.characterId,
    type: fragment.type,
    content: fragment.content,
    label: fragment.label ?? null,
    position: fragment.position,
    size: fragment.size,
  })
  if (error) throw new Error(error.message)
}

/**
 * Inserts a new book into Supabase.
 * Throws on error so the caller can show a message.
 */
export async function createBook(book: Book): Promise<void> {
  const { error } = await supabase.from("books").insert({
    id: book.id,
    title: book.title,
    author: book.author,
    year: book.year,
    language: book.language,
    total_chapters: book.totalChapters,
    current_chapter: book.currentChapter,
    cover_color: book.coverColor,
  })
  if (error) throw new Error(error.message)
}

/**
 * Inserts a new character into Supabase.
 * Throws on error so the caller can show a message.
 */
export async function createCharacter(character: Character): Promise<void> {
  const { error } = await supabase.from("characters").insert({
    id: character.id,
    book_id: character.bookId,
    name: character.name,
    nicknames: character.nicknames,
    description: character.description,
    tags: character.tags,
    color: character.color,
    status: character.status,
    appears_in_chapter: character.appearsInChapter,
    avatar_type: character.avatarType ?? null,
  })
  if (error) throw new Error(error.message)
}

/**
 * Inserts a new relationship into Supabase.
 * The two character ids must already exist (the table has foreign keys to
 * `characters`), so always save the characters BEFORE their relationships.
 * Throws on error so the caller can show a message.
 */
export async function createRelationship(relationship: Relationship): Promise<void> {
  const { error } = await supabase.from("relationships").insert({
    id: relationship.id,
    book_id: relationship.bookId,
    from_character_id: relationship.fromCharacterId,
    to_character_id: relationship.toCharacterId,
    type: relationship.type,
    label: relationship.label ?? null,
    description: relationship.description ?? null,
    strength: relationship.strength,
    is_secret: relationship.isSecret ?? false,
    revealed_in_chapter: relationship.revealedInChapter ?? null,
  })
  if (error) throw new Error(error.message)
}

/**
 * Updates an existing character (matched by id).
 * Throws on error so the caller can show a message.
 */
export async function updateCharacter(character: Character): Promise<void> {
  const { error } = await supabase
    .from("characters")
    .update({
      name: character.name,
      nicknames: character.nicknames,
      description: character.description,
      tags: character.tags,
      color: character.color,
      status: character.status,
      appears_in_chapter: character.appearsInChapter,
      avatar_type: character.avatarType ?? null,
    })
    .eq("id", character.id)
  if (error) throw new Error(error.message)
}
