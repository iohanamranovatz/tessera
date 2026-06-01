"use client"

interface StepIndicatorProps {
  currentStep: number
  totalSteps: number
}

export function StepIndicator({ currentStep, totalSteps }: StepIndicatorProps) {
  return (
    <div className="flex gap-2">
      {Array.from({ length: totalSteps }).map((_, index) => (
        <div
          key={index}
          className={`h-0.5 w-8 rounded-full transition-colors duration-300 ${
            index < currentStep ? "bg-primary" : "bg-muted"
          }`}
        />
      ))}
    </div>
  )
}
