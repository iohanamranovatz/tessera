import { redirect } from "next/navigation"

/**
 * Root route. New visitors start at the onboarding flow, where they add their
 * first book. (Existing books live at /book/[bookId] and /library.)
 */
export default function Home() {
  redirect("/onboarding")
}
