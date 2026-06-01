"use client"

import { useRouter } from "next/navigation"
import { OnboardingFlow } from "@/components/tessera/onboarding/onboarding-flow"

export default function OnboardingPage() {
  const router = useRouter()

  const handleComplete = () => {
    router.push("/")
  }

  return <OnboardingFlow onComplete={handleComplete} />
}
