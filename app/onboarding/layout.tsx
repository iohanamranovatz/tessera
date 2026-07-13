"use client"

/**
 * Layout-ul flow-ului /onboarding.
 *
 * Două roluri:
 *  1. Pune <OnboardingProvider> în jurul tuturor ecranelor, ca memoria partajată
 *     să supraviețuiască navigării între rute.
 *  2. Desenează stepper-ul (bara de progres cu 4 pași) în partea de sus. Pasul activ
 *     e dedus din ruta curentă cu usePathname().
 */

import { usePathname } from "next/navigation"
import { RequireAuth } from "@/components/auth/RequireAuth"
import { OnboardingProvider } from "./OnboardingContext"

/** Cei 4 pași, în ordine. `slug` se potrivește cu numele folderului din /onboarding. */
const STEPS = [
  { slug: "title", label: "The book" },
  { slug: "context", label: "Your context" },
  { slug: "characters", label: "Characters" },
  { slug: "done", label: "Done" },
]

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  // Găsim pasul curent după bucata de rută (ex: /onboarding/context → index 1).
  const foundIndex = STEPS.findIndex((step) => pathname?.includes(`/onboarding/${step.slug}`))
  const activeStep = foundIndex === -1 ? 0 : foundIndex

  return (
    <RequireAuth>
      <OnboardingProvider>
      <div className="flex min-h-screen flex-col bg-background paper-texture">
        {/* Stepper */}
        <header className="px-8 pt-12">
          <div className="mx-auto flex max-w-md items-start gap-2">
            {STEPS.map((step, index) => {
              const isDone = index <= activeStep
              const isActive = index === activeStep
              return (
                <div key={step.slug} className="flex flex-1 flex-col items-center gap-2">
                  <div
                    className={`h-0.5 w-full rounded-full transition-colors duration-300 ${
                      isDone ? "bg-primary" : "bg-muted"
                    }`}
                  />
                  <span
                    className={`text-center font-serif text-[11px] italic tracking-wide transition-colors ${
                      isActive ? "text-primary" : "text-muted-foreground"
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              )
            })}
          </div>
        </header>

        {/* Ecranul curent */}
        <div className="flex flex-1 flex-col">{children}</div>
      </div>
      </OnboardingProvider>
    </RequireAuth>
  )
}
