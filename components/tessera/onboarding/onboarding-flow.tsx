"use client"

import { useState } from "react"
import { Step1WhatAreYouReading } from "./step-1-book"
import { Step2YourContext } from "./step-2-context"
import { Step3Loading } from "./step-3-loading"
import { Step4Review } from "./step-4-review"

type OnboardingStep = 1 | 2 | 3 | 4 | "complete"

interface OnboardingContext {
  bookTitle: string
  readingStatus: "first-time" | "rereading" | "already-know"
  chapter: number
}

interface OnboardingFlowProps {
  onComplete: () => void
}

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [step, setStep] = useState<OnboardingStep>(1)
  const [context, setContext] = useState<OnboardingContext>({
    bookTitle: "",
    readingStatus: "first-time",
    chapter: 8,
  })

  const handleStep1Continue = (bookTitle: string) => {
    setContext((prev) => ({ ...prev, bookTitle }))
    setStep(2)
  }

  const handleStep2Continue = (data: { status: "first-time" | "rereading" | "already-know"; chapter: number }) => {
    setContext((prev) => ({ ...prev, readingStatus: data.status, chapter: data.chapter }))
    setStep(3)
  }

  const handleLoadingComplete = () => {
    setStep(4)
  }

  const handleChangeContext = () => {
    setStep(2)
  }

  const handleFinalComplete = () => {
    setStep("complete")
    onComplete()
  }

  switch (step) {
    case 1:
      return <Step1WhatAreYouReading onContinue={handleStep1Continue} />
    case 2:
      return (
        <Step2YourContext
          bookTitle={context.bookTitle}
          onBack={() => setStep(1)}
          onContinue={handleStep2Continue}
        />
      )
    case 3:
      return <Step3Loading onComplete={handleLoadingComplete} />
    case 4:
      return (
        <Step4Review
          bookTitle={context.bookTitle || "The Brothers Karamazov"}
          chapter={context.chapter}
          onChangeContext={handleChangeContext}
          onComplete={handleFinalComplete}
        />
      )
    default:
      return null
  }
}
