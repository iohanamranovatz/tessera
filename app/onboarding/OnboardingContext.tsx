"use client"

/**
 * OnboardingContext — memoria partajată a flow-ului de adăugare carte.
 *
 * Cele 4 ecrane (title → context → characters → done) trăiesc pe rute diferite,
 * dar trebuie să-și amintească toate datele între ele: dacă userul apasă „înapoi"
 * de pe ecranul 3, datele de pe ecranul 1 trebuie să fie încă acolo.
 *
 * Soluția: ținem totul într-un React Context așezat în layout-ul /onboarding.
 * Atâta timp cât userul rămâne în interiorul flow-ului, layout-ul nu se remontează,
 * deci starea supraviețuiește navigării dintre ecrane.
 *
 * NB: starea trăiește doar în memorie. Dacă userul dă refresh la pagină, se pierde —
 * ceea ce e ok pentru un flow scurt de onboarding.
 */

import { createContext, useContext, useState, type ReactNode } from "react"
import type { CharacterStatus, RelationshipType } from "@/types"

/** Un personaj adăugat în timpul onboarding-ului (încă nesalvat în DB). */
export interface OnboardingCharacterDraft {
  /** Id local (crypto.randomUUID) — ne ajută să-l edităm/ștergem din listă. */
  id: string
  name: string
  /** Porecle/diminutive, ex: ["Mitya", "Mitka"]. */
  nicknames: string[]
  /** Etichete descriptive, ex: ["pasional", "militar"]. */
  tags: string[]
  /** Culoarea de accent aleasă din paletă (hex, ex: "#8a3020"). */
  color: string
  // --- câmpuri completate doar de AI (formularul manual nu le cere) ---
  /** Descriere scurtă, spoiler-safe. Gol dacă personajul e adăugat manual. */
  description?: string
  status?: CharacterStatus
  /** Primul capitol în care apare (pentru filtrul anti-spoiler). */
  appearsInChapter?: number
  /** Căutări vizuale — folosite la salvare ca să aducem imagini reale pe board
   *  (vezi /api/generate-fragments). Vin de la AI SAU le scrie userul manual în
   *  formularul de personaj (câmpul „Image search terms"). */
  imageQueries?: string[]
  /** Simbol/glif opțional (ex: „∞", „🕯") introdus manual. La salvare devine un
   *  fragment de tip „symbol" pe board. */
  symbol?: string
  /** Aprobat pentru salvare? La review, userul poate respinge personaje propuse de
   *  AI. `undefined` sau `true` = aprobat; `false` = respins (nu se salvează). */
  approved?: boolean
}

/**
 * O relație între două personaje, completată de AI.
 * Leagă personajele prin id-ul lor de schiță (`OnboardingCharacterDraft.id`).
 */
export interface OnboardingRelationshipDraft {
  id: string
  fromCharacterId: string
  toCharacterId: string
  type: RelationshipType
  label?: string
  description?: string
  strength: 1 | 2 | 3
  isSecret?: boolean
  revealedInChapter?: number
}

/** Tot ce strânge flow-ul de onboarding, înainte de salvarea finală. */
export interface OnboardingData {
  // --- ecran 1: title ---
  title: string
  author: string
  /** Le ținem ca text cât timp suntem în input-uri; le transformăm în număr la salvare. */
  year: string
  totalChapters: string
  // --- ecran 2: context ---
  /** „Ai citit deja cartea?" — true = am citit-o, false = o citesc acum. */
  hasRead: boolean
  /** „La ce capitol ești?" — text acum, număr la salvare. */
  currentChapter: string
  // --- ecran 3: characters ---
  characters: OnboardingCharacterDraft[]
  // --- completate de AI ---
  /** Limba originală a cărții (ex: "Russian"). Gol dacă nu o știm. */
  language: string
  /** Relațiile dintre personaje (doar din AI deocamdată). */
  relationships: OnboardingRelationshipDraft[]
}

/** Valorile de pornire — flow-ul începe gol. */
const EMPTY: OnboardingData = {
  title: "",
  author: "",
  year: "",
  totalChapters: "",
  hasRead: false,
  currentChapter: "1",
  characters: [],
  language: "",
  relationships: [],
}

interface OnboardingContextValue {
  data: OnboardingData
  /** Setează un singur câmp simplu (title, author, hasRead etc.). */
  setField: <K extends keyof OnboardingData>(key: K, value: OnboardingData[K]) => void
  addCharacter: (character: OnboardingCharacterDraft) => void
  updateCharacter: (id: string, patch: Partial<OnboardingCharacterDraft>) => void
  removeCharacter: (id: string) => void
  /** Înlocuiește toată lista de personaje (folosit la completarea cu AI). */
  setCharacters: (characters: OnboardingCharacterDraft[]) => void
  /** Înlocuiește toate relațiile (folosit la completarea cu AI). */
  setRelationships: (relationships: OnboardingRelationshipDraft[]) => void
  /** Golește tot (după ce am salvat cu succes). */
  reset: () => void
}

const OnboardingCtx = createContext<OnboardingContextValue | null>(null)

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<OnboardingData>(EMPTY)

  function setField<K extends keyof OnboardingData>(key: K, value: OnboardingData[K]) {
    setData((prev) => ({ ...prev, [key]: value }))
  }

  function addCharacter(character: OnboardingCharacterDraft) {
    setData((prev) => ({ ...prev, characters: [...prev.characters, character] }))
  }

  function updateCharacter(id: string, patch: Partial<OnboardingCharacterDraft>) {
    setData((prev) => ({
      ...prev,
      characters: prev.characters.map((ch) => (ch.id === id ? { ...ch, ...patch } : ch)),
    }))
  }

  function removeCharacter(id: string) {
    setData((prev) => ({
      ...prev,
      characters: prev.characters.filter((ch) => ch.id !== id),
      // Scoatem și relațiile care atârnau de personajul șters (altfel rămân orfane).
      relationships: prev.relationships.filter(
        (rel) => rel.fromCharacterId !== id && rel.toCharacterId !== id,
      ),
    }))
  }

  function setCharacters(characters: OnboardingCharacterDraft[]) {
    setData((prev) => ({ ...prev, characters }))
  }

  function setRelationships(relationships: OnboardingRelationshipDraft[]) {
    setData((prev) => ({ ...prev, relationships }))
  }

  function reset() {
    setData(EMPTY)
  }

  return (
    <OnboardingCtx.Provider
      value={{
        data,
        setField,
        addCharacter,
        updateCharacter,
        removeCharacter,
        setCharacters,
        setRelationships,
        reset,
      }}
    >
      {children}
    </OnboardingCtx.Provider>
  )
}

/** Hook de acces. Aruncă eroare dacă e folosit în afara provider-ului (greșeală de programare). */
export function useOnboarding() {
  const ctx = useContext(OnboardingCtx)
  if (!ctx) {
    throw new Error("useOnboarding must be used inside <OnboardingProvider>.")
  }
  return ctx
}
