"use client"

import { useState } from "react"
import { StepIndicator } from "./step-indicator"
import { Shield } from "lucide-react"

type ReadingStatus = "first-time" | "rereading" | "already-know"

interface Step2Props {
  bookTitle: string
  onBack: () => void
  onContinue: (context: { status: ReadingStatus; chapter: number }) => void
}

export function Step2YourContext({ bookTitle, onBack, onContinue }: Step2Props) {
  const [status, setStatus] = useState<ReadingStatus>("first-time")
  const [chapter, setChapter] = useState(8)
  const totalChapters = 12

  const statusOptions: { value: ReadingStatus; label: string }[] = [
    { value: "first-time", label: "first time" },
    { value: "rereading", label: "I'm rereading" },
    { value: "already-know", label: "I already know it" },
  ]

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="pt-12 px-8">
        <StepIndicator currentStep={2} totalSteps={4} />
      </div>

      <div className="flex-1 flex flex-col justify-center px-8 max-w-2xl mx-auto w-full">
        <p className="text-xs tracking-[0.2em] uppercase text-muted-foreground mb-4">
          Your Context
        </p>
        
        <h1 className="text-3xl md:text-4xl text-foreground italic font-serif mb-12">
          A few questions before we build your world.
        </h1>

        {/* Question 1 */}
        <div className="mb-12">
          <p className="text-foreground text-lg mb-4 font-serif">
            Have you read the book before?
          </p>
          <div className="flex flex-wrap gap-3">
            {statusOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setStatus(option.value)}
                className={`px-5 py-2.5 rounded-full font-serif italic text-sm transition-all ${
                  status === option.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-transparent border border-muted-foreground/40 text-muted-foreground hover:border-primary/60 hover:text-foreground"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Question 2 */}
        <div className="mb-12">
          <p className="text-foreground text-lg mb-4 font-serif">
            What chapter are you on?
          </p>
          <p className="text-2xl md:text-3xl text-foreground italic font-serif">
            chapter{" "}
            <span className="inline-flex items-center">
              [
              <input
                type="number"
                value={chapter}
                onChange={(e) => setChapter(Math.max(1, Math.min(totalChapters, parseInt(e.target.value) || 1)))}
                className="w-10 bg-transparent text-center text-primary focus:outline-none"
                min={1}
                max={totalChapters}
              />
              ]
            </span>
            {" "}of {totalChapters}
          </p>
          <p className="text-sm text-muted-foreground mt-3 italic">
            {"we'll hide everything that happens after this chapter"}
          </p>
        </div>

        {/* Info box */}
        <div className="flex items-start gap-3 p-4 bg-card border border-border rounded">
          <Shield className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
          <p className="text-sm text-muted-foreground italic">
            <span className="text-foreground">anti-spoiler filter active</span> — {"we'll only generate from what you've already read"}
          </p>
        </div>
      </div>

      <div className="p-8 flex justify-between">
        <button
          onClick={onBack}
          className="px-6 py-3 text-muted-foreground font-serif italic hover:text-foreground transition-colors"
        >
          back
        </button>
        <button
          onClick={() => onContinue({ status, chapter })}
          className="px-6 py-3 bg-primary text-primary-foreground font-serif italic rounded hover:bg-primary/90 transition-colors"
        >
          build my world
        </button>
      </div>
    </div>
  )
}
