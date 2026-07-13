"use client"

/**
 * RequireAuth — gardă de rută pe client.
 *
 * Pune-l în jurul conținutului care cere autentificare (library, onboarding,
 * pagina unei cărți). Cât timp verificăm sesiunea afișăm un loader; dacă nu e
 * nimeni logat, redirecționăm spre /login păstrând ruta cerută în ?redirect=,
 * ca după login să revenim exact unde voia userul.
 */

import { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useAuth } from "@/context/AuthContext"

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!loading && !user) {
      const redirect = encodeURIComponent(pathname ?? "/library")
      router.replace(`/login?redirect=${redirect}`)
    }
  }, [loading, user, pathname, router])

  // Cât verificăm sesiunea SAU cât redirecționăm (user încă null), nu arătăm
  // conținutul protejat — doar un loader discret.
  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center paper-texture">
        <p className="font-serif italic text-muted-foreground">Loading…</p>
      </div>
    )
  }

  return <>{children}</>
}
