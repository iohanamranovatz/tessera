import { redirect } from "next/navigation"

/**
 * /onboarding nu are conținut propriu — e doar poarta de intrare în flow.
 * Trimitem userul la primul ecran real: /onboarding/title.
 */
export default function OnboardingPage() {
  redirect("/onboarding/title")
}
