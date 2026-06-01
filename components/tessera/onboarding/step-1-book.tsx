"use client"

import { useState } from "react"
import { StepIndicator } from "./step-indicator"

interface BookSuggestion {
  title: string
  author: string
  year: string
}

const suggestions: BookSuggestion[] = [
  { title: "The Brothers Karamazov", author: "Fyodor Dostoevsky", year: "1880" },
  { title: "The Brother's War", author: "Jeff Grubb", year: "1998" },
]

interface Step1Props {
  onContinue: (bookTitle: string) => void
}

export function Step1WhatAreYouReading({ onContinue }: Step1Props) {
  const [query, setQuery] = useState("")
  const [showSuggestions, setShowSuggestions] = useState(false)

  const filteredSuggestions = query.length > 0 
    ? suggestions.filter(s => 
        s.title.toLowerCase().includes(query.toLowerCase())
      )
    : []

  const handleSelect = (book: BookSuggestion) => {
    setQuery(book.title)
    setShowSuggestions(false)
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="pt-12 px-8">
        <StepIndicator currentStep={1} totalSteps={4} />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-8 -mt-20">
        <p className="text-xs tracking-[0.2em] uppercase text-muted-foreground mb-6">
          A New World
        </p>
        
        <h1 className="text-4xl md:text-5xl text-foreground italic font-serif mb-16 text-center">
          What are you reading?
        </h1>

        <div className="w-full max-w-md relative">
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setShowSuggestions(true)
            }}
            onFocus={() => setShowSuggestions(true)}
            placeholder="The Brothers Karamazov..."
            className="w-full bg-transparent border-b border-muted-foreground/40 pb-3 text-xl text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary italic font-serif transition-colors"
          />

          {showSuggestions && filteredSuggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded shadow-xl overflow-hidden z-10">
              {filteredSuggestions.map((book, index) => (
                <button
                  key={index}
                  onClick={() => handleSelect(book)}
                  className="w-full px-4 py-3 text-left hover:bg-muted/50 transition-colors flex justify-between items-baseline"
                >
                  <span className="text-foreground italic font-serif">{book.title}</span>
                  <span className="text-muted-foreground text-sm">
                    {book.author}, {book.year}
                  </span>
                </button>
              ))}
            </div>
          )}

          <p className="text-xs text-muted-foreground mt-4 italic">
            automatic search in Wikipedia + Open Library
          </p>
        </div>
      </div>

      <div className="p-8 flex justify-end">
        <button
          onClick={() => onContinue(query)}
          disabled={!query}
          className="px-6 py-3 bg-primary text-primary-foreground font-serif italic rounded hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          continue &rarr;
        </button>
      </div>
    </div>
  )
}
