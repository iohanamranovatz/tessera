"use client"

/**
 * AuthForm — formularul de login / signup, în stilul dark-academia al Tessera.
 *
 * Un singur component pentru ambele moduri (`mode`), ca cele două pagini să fie
 * subțiri și consistente. La succes:
 *   - login  → mergem la ?redirect= (implicit /library)
 *   - signup → dacă proiectul cere confirmare pe email, arătăm un mesaj;
 *              altfel intrăm direct și mergem la ?redirect=.
 *
 * useSearchParams cere o graniță <Suspense> în App Router — vezi paginile.
 */

import { useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/context/AuthContext"

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const { signIn, signUp } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get("redirect") || "/library"

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  const isLogin = mode === "login"

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (submitting) return
    setError(null)
    setInfo(null)
    setSubmitting(true)
    try {
      if (isLogin) {
        await signIn(email.trim(), password)
        router.replace(redirect)
      } else {
        const { needsConfirmation } = await signUp(email.trim(), password)
        if (needsConfirmation) {
          setInfo(
            "We've sent a confirmation link to your email. Confirm it, then sign in.",
          )
        } else {
          router.replace(redirect)
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center paper-texture px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-2 text-center font-serif text-3xl italic text-foreground">
          {isLogin ? "Welcome back" : "Create your account"}
        </h1>
        <p className="mb-8 text-center font-serif text-sm italic text-muted-foreground">
          tessera · your literary universe
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="mb-1.5 block text-xs uppercase tracking-[0.15em] text-muted-foreground"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded border border-border bg-card/40 px-3 py-2.5 font-serif text-foreground outline-none transition-colors focus:border-primary"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block text-xs uppercase tracking-[0.15em] text-muted-foreground"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete={isLogin ? "current-password" : "new-password"}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded border border-border bg-card/40 px-3 py-2.5 font-serif text-foreground outline-none transition-colors focus:border-primary"
              placeholder={isLogin ? "Your password" : "At least 6 characters"}
            />
          </div>

          {error && (
            <p className="rounded border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm italic text-destructive">
              {error}
            </p>
          )}
          {info && (
            <p className="rounded border border-border bg-card/40 px-3 py-2 text-sm italic text-muted-foreground">
              {info}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded bg-primary px-6 py-3 font-serif italic text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting
              ? isLogin
                ? "signing in…"
                : "creating…"
              : isLogin
                ? "sign in →"
                : "create account →"}
          </button>
        </form>

        <p className="mt-6 text-center font-serif text-sm italic text-muted-foreground">
          {isLogin ? (
            <>
              No account yet?{" "}
              <Link href="/signup" className="text-primary underline-offset-4 hover:underline">
                Sign up
              </Link>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <Link href="/login" className="text-primary underline-offset-4 hover:underline">
                Sign in
              </Link>
            </>
          )}
        </p>
      </div>
    </div>
  )
}
