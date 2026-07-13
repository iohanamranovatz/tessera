import { redirect } from "next/navigation"

/**
 * Root route. Trimitem spre bibliotecă; dacă vizitatorul nu e logat, garda
 * RequireAuth din /library îl duce la /login (și de acolo poate merge la signup,
 * apoi în onboarding pentru prima carte).
 */
export default function Home() {
  redirect("/library")
}
