"use client"

import { useState } from "react"
import { StepIndicator } from "./step-indicator"
import { Check, AlertTriangle, ExternalLink } from "lucide-react"

interface Character {
  id: string
  name: string
  nicknames: string
  color: string
  approved: boolean
  spoilerWarning?: string
}

const initialCharacters: Character[] = [
  { id: "1", name: "Dmitri Karamazov", nicknames: "Mitya, Mitka", color: "#8a3020", approved: true },
  { id: "2", name: "Ivan Karamazov", nicknames: "Vanya", color: "#2a4a5a", approved: true },
  { id: "3", name: "Alexei Karamazov", nicknames: "Alyosha, Lyosha", color: "#8a6a28", approved: true },
  { id: "4", name: "Fyodor Karamazov", nicknames: "The Old Man", color: "#3a2820", approved: true },
  { id: "5", name: "Smerdyakov", nicknames: "Pavel", color: "#4a4035", approved: false, spoilerWarning: "appears in ch. 5 · spoiler risk" },
]

const paletteColors = ["#8a3020", "#2a4a5a", "#8a6a28", "#3a2820", "#c9b896"]

interface Step4Props {
  bookTitle: string
  chapter: number
  onChangeContext: () => void
  onComplete: () => void
}

export function Step4Review({ bookTitle, chapter, onChangeContext, onComplete }: Step4Props) {
  const [characters, setCharacters] = useState(initialCharacters)

  const approvedCount = characters.filter((c) => c.approved).length
  const rejectedCount = characters.filter((c) => !c.approved).length

  const toggleCharacter = (id: string) => {
    setCharacters((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, approved: !c.approved } : c
      )
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="pt-12 px-8">
        <StepIndicator currentStep={4} totalSteps={4} />
      </div>

      <div className="flex-1 px-8 py-8 max-w-4xl mx-auto w-full">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-4 mb-8">
          <div>
            <p className="text-xs tracking-[0.2em] uppercase text-muted-foreground mb-2">
              Review the Proposed World
            </p>
            <p className="text-xl text-foreground italic font-serif">
              {bookTitle} <span className="text-muted-foreground">· up to chapter {chapter}</span>
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            <span className="text-primary">{approvedCount} approved</span> · {rejectedCount} rejected
          </p>
        </div>

        {/* Characters section */}
        <div className="mb-8">
          <h2 className="text-sm text-muted-foreground uppercase tracking-wide mb-4">
            Characters found
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {characters.map((character) => (
              <div
                key={character.id}
                className="flex items-center gap-3 p-3 bg-card border border-border rounded"
              >
                <div
                  className="w-1 h-10 rounded-full flex-shrink-0"
                  style={{ backgroundColor: character.color }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-foreground italic font-serif truncate">{character.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{character.nicknames}</p>
                  {character.spoilerWarning && (
                    <div className="flex items-center gap-1 mt-1">
                      <AlertTriangle className="w-3 h-3 text-yellow-600" />
                      <span className="text-xs text-yellow-600">{character.spoilerWarning}</span>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => toggleCharacter(character.id)}
                  className={`w-8 h-8 rounded flex items-center justify-center transition-colors flex-shrink-0 ${
                    character.approved
                      ? "bg-primary/20 text-primary hover:bg-primary/30"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  <Check className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Two cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          {/* Visual Fragments card */}
          <div className="p-4 bg-card border border-border rounded">
            <p className="text-xs tracking-[0.15em] uppercase text-muted-foreground mb-2">
              Visual Fragments
            </p>
            <p className="text-foreground font-serif mb-2">
              12 fragments <span className="text-muted-foreground">· Met + Wikimedia</span>
            </p>
            <p className="text-sm text-muted-foreground italic mb-3">
              military uniforms · Byzantine icons · hands · cognac glasses · letters
            </p>
            <button className="text-sm text-primary hover:text-primary/80 transition-colors inline-flex items-center gap-1">
              see all <ExternalLink className="w-3 h-3" />
            </button>
          </div>

          {/* Palette card */}
          <div className="p-4 bg-card border border-border rounded">
            <p className="text-xs tracking-[0.15em] uppercase text-muted-foreground mb-2">
              Palette
            </p>
            <div className="flex gap-2 mb-3">
              {paletteColors.map((color, index) => (
                <div
                  key={index}
                  className="w-8 h-8 rounded-full border border-border"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            <p className="text-sm text-muted-foreground italic">
              sepia · ochre · cognac red · 19th century Russian, ascetic
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-8 flex justify-between border-t border-border">
        <button
          onClick={onChangeContext}
          className="px-6 py-3 text-muted-foreground font-serif italic border border-muted-foreground/40 rounded hover:border-primary/60 hover:text-foreground transition-colors"
        >
          change context
        </button>
        <button
          onClick={onComplete}
          className="px-6 py-3 bg-primary text-primary-foreground font-serif italic rounded hover:bg-primary/90 transition-colors"
        >
          open the universe &rarr;
        </button>
      </div>
    </div>
  )
}
