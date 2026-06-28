/**
 * rate-limit.ts — wrapper subțire peste funcția Postgres `consume_rate_limit`.
 *
 * De ce server-side în Supabase și nu in-memory: pe Vercel rulăm în serverless,
 * unde fiecare invocare poate ateriza pe altă instanță. Un Map in-memory ar
 * număra greșit între instanțe. Counter-ul în DB e singura sursă comună.
 *
 * Folosire (din interiorul unei rute API):
 *   const limit = await checkRateLimit(request, "generate-book", 10, 60)
 *   if (!limit.ok) return rateLimitResponse(limit)
 *
 * Limită implicită potrivită pentru rutele AI ale Tessera: ~10 req/min per IP.
 * Userul rapid abia depășește 1 generare/min în onboarding — atacatorul greu.
 */

import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

/** Răspuns întors de `checkRateLimit`. */
export interface RateLimitResult {
  /** True = trece, request-ul poate continua. False = a depășit limita. */
  ok: boolean
  /** Secunde rămase până la resetarea window-ului — util în răspunsul 429. */
  retryAfter: number
}

/**
 * Client Supabase server-side. Folosim service-role doar dacă e setată;
 * altfel, anon (funcția RPC e expusă anonimilor în migrarea 002, deci merge).
 * Service-role-ul evită orice constrângere RLS și e marginal mai rapid.
 */
function getServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    throw new Error("Missing Supabase env vars for rate limiting.")
  }
  return createClient(url, key, { auth: { persistSession: false } })
}

/**
 * Extrage IP-ul clientului din header-ele puse de Vercel/edge proxy.
 * Ordinea contează: x-forwarded-for vine de la ultimul proxy și poate fi o
 * listă comma-separated (primul = IP-ul real). Fallback la "unknown" pentru
 * cazurile de test local.
 */
function getClientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for")
  if (fwd) return fwd.split(",")[0]!.trim()
  const real = request.headers.get("x-real-ip")
  if (real) return real.trim()
  return "unknown"
}

/**
 * Consumă o cerere din bucket-ul `(routeName, ip)`. Returnează ok=true dacă
 * încă mai e loc în window-ul curent.
 *
 * @param request       Request-ul Next.js (pentru IP).
 * @param routeName     Eticheta rutei (apare în cheie), ex: "generate-book".
 * @param limit         Câte cereri sunt permise per fereastră.
 * @param windowSeconds Lățimea ferestrei, în secunde.
 */
export async function checkRateLimit(
  request: Request,
  routeName: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const ip = getClientIp(request)
  const key = `${routeName}:${ip}`

  try {
    const supabase = getServerClient()
    const { data, error } = await supabase.rpc("consume_rate_limit", {
      p_key: key,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    })
    if (error) {
      // Fail-open: dacă DB-ul nu răspunde, nu blocăm trafic legitim.
      // (Alternativă mai paranoidă: fail-closed cu 503 — preferăm UX-ul aici.)
      console.error("[rate-limit] RPC error, failing open:", error.message)
      return { ok: true, retryAfter: 0 }
    }
    const ok = data === true
    return { ok, retryAfter: ok ? 0 : windowSeconds }
  } catch (err) {
    console.error("[rate-limit] unexpected error, failing open:", err)
    return { ok: true, retryAfter: 0 }
  }
}

/**
 * Construiește răspunsul 429 standard pentru o cerere refuzată.
 * Mesajul e prietenos (UI-ul îl poate afișa); Retry-After îl spune browserelor
 * și client-ilor scriptați când să mai încerce.
 */
export function rateLimitResponse(result: RateLimitResult): NextResponse {
  return NextResponse.json(
    {
      error:
        "Too many requests in a short time. Please wait a minute and try again.",
    },
    {
      status: 429,
      headers: { "Retry-After": String(result.retryAfter) },
    },
  )
}
