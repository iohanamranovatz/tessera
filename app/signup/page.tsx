import { Suspense } from "react"
import { AuthForm } from "@/components/auth/AuthForm"

/**
 * /signup — creare cont cu email + parolă.
 */
export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <AuthForm mode="signup" />
    </Suspense>
  )
}
