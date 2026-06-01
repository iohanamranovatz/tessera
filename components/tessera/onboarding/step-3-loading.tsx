"use client"

import { useEffect, useState } from "react"
import { StepIndicator } from "./step-indicator"

const loadingSteps = [
  "Reading about Karamazov on Wikipedia...",
  "Extracting character relationships...",
  "Finding visual references...",
  "Building the color palette...",
  "Assembling your universe...",
]

interface FragmentPosition {
  id: number
  x: number
  y: number
  rotation: number
  delay: number
  visible: boolean
}

interface Step3Props {
  onComplete: () => void
}

export function Step3Loading({ onComplete }: Step3Props) {
  const [currentStep, setCurrentStep] = useState(0)
  const [fragments, setFragments] = useState<FragmentPosition[]>([
    { id: 1, x: 15, y: 20, rotation: -8, delay: 0, visible: false },
    { id: 2, x: 55, y: 15, rotation: 5, delay: 400, visible: false },
    { id: 3, x: 80, y: 25, rotation: -3, delay: 800, visible: false },
    { id: 4, x: 25, y: 50, rotation: 7, delay: 1200, visible: false },
    { id: 5, x: 50, y: 45, rotation: -5, delay: 1600, visible: false },
    { id: 6, x: 75, y: 55, rotation: 4, delay: 2000, visible: false },
    { id: 7, x: 10, y: 75, rotation: -6, delay: 2400, visible: false },
    { id: 8, x: 45, y: 70, rotation: 8, delay: 2800, visible: false },
    { id: 9, x: 70, y: 80, rotation: -4, delay: 3200, visible: false },
  ])

  useEffect(() => {
    // Animate fragments appearing one by one
    fragments.forEach((fragment) => {
      setTimeout(() => {
        setFragments((prev) =>
          prev.map((f) =>
            f.id === fragment.id ? { ...f, visible: true } : f
          )
        )
      }, fragment.delay)
    })

    // Progress through loading steps
    const stepInterval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev >= loadingSteps.length - 1) {
          clearInterval(stepInterval)
          setTimeout(onComplete, 1500)
          return prev
        }
        return prev + 1
      })
    }, 1200)

    return () => clearInterval(stepInterval)
  }, [onComplete])

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="pt-12 px-8">
        <StepIndicator currentStep={3} totalSteps={4} />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-8">
        {/* Fragment animation area */}
        <div className="relative w-full max-w-xl h-80 mb-12">
          {/* Center glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-primary/10 rounded-full blur-3xl" />
          
          {/* Fragments */}
          {fragments.map((fragment) => (
            <div
              key={fragment.id}
              className={`absolute transition-all duration-700 ease-out ${
                fragment.visible ? "opacity-100 scale-100" : "opacity-0 scale-75"
              }`}
              style={{
                left: `${fragment.x}%`,
                top: `${fragment.y}%`,
                transform: `rotate(${fragment.rotation}deg)`,
              }}
            >
              <div className="polaroid w-16 h-20 sm:w-20 sm:h-24">
                <div className="w-full h-full bg-muted/50" />
              </div>
            </div>
          ))}
        </div>

        {/* Loading text */}
        <p className="text-xl text-foreground italic font-serif mb-3 text-center animate-pulse">
          {loadingSteps[currentStep]}
        </p>
        <p className="text-sm text-muted-foreground">
          step {currentStep + 1} of {loadingSteps.length}
        </p>
      </div>
    </div>
  )
}
