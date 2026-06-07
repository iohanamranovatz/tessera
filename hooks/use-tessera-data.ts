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
import type { Book, Character, Fragment } from "@/types"

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

/** Loads all characters for a book. */
export function useCharacters(bookId: string) {
  const [data, setData] = useState<Character[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    setLoading(true)
    supabase
      .from("characters")
      .select("*")
      .eq("book_id", bookId)
      .then(({ data, error }) => {
        if (!active) return
        if (error) console.error("useCharacters:", error.message)
        setData((data ?? []).map(mapCharacter))
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
