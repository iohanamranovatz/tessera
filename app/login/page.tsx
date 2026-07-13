import { Suspense } from "react"
import { AuthForm } from "@/components/auth/AuthForm"

/**
 * /login — logare cu email + parolă.
 *
 * AuthForm citește ?redirect= prin useSearchParams, care în App Router trebuie
 * să stea sub o graniță <Suspense>.
 */
export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <AuthForm mode="login" />
    </Suspense>
  )
}
