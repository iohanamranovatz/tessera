"use client"

/**
 * AuthContext — sesiunea de utilizator, pusă la dispoziția întregii aplicații.
 *
 * Folosește Supabase Auth (email + parolă) prin clientul de browser din
 * `lib/supabase/client.ts`. Supabase-js păstrează singur sesiunea în
 * localStorage și atașează automat JWT-ul la fiecare cerere spre DB — de aceea
 * politicile RLS (auth.uid()) filtrează datele fără cod suplimentar în hooks.
 *
 * Expune:
 *   { user, session, loading, signIn, signUp, signOut }
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react"
import type { Session, User } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase/client"

interface AuthState {
  /** Utilizatorul curent, sau null dacă nimeni nu e logat. */
  user: User | null
  /** Sesiunea completă (token-uri etc.), sau null. */
  session: Session | null
  /** True cât timp verificăm sesiunea inițială — evită flash-ul de „nelogat". */
  loading: boolean
  /** Logare cu email + parolă. Aruncă Error cu mesaj lizibil la eșec. */
  signIn: (email: string, password: string) => Promise<void>
  /**
   * Înregistrare cu email + parolă. Aruncă Error la eșec.
   * Returnează `needsConfirmation: true` dacă proiectul Supabase are activă
   * confirmarea prin email (atunci nu există sesiune până la click pe link).
   */
  signUp: (email: string, password: string) => Promise<{ needsConfirmation: boolean }>
  /** Deconectare. */
  signOut: () => Promise<void>
  /**
   * GDPR „right to erasure": șterge DEFINITIV contul + tot conținutul (prin
   * funcția Postgres delete_user, vezi migrations/004). Apoi deconectează local.
   */
  deleteAccount: () => Promise<void>
}

const AuthContext = createContext<AuthState | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 1. Sesiunea existentă la încărcarea paginii.
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    // 2. Ascultăm schimbările (login, logout, refresh de token) și în alte taburi.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })

    return () => sub.subscription.unsubscribe()
  }, [])

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw new Error(error.message)
  }

  async function signUp(email: string, password: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // Linkul din emailul de confirmare redirecționează ÎNAPOI la site-ul de
        // unde s-a înregistrat userul (localhost în dev, domeniul real în prod),
        // nu la un URL fix. Fără asta, Supabase folosește Site URL-ul din
        // dashboard (implicit localhost:3000) → eroare când testezi pe deploy.
        // URL-ul trebuie să fie și în lista „Redirect URLs" din Supabase.
        emailRedirectTo:
          typeof window !== "undefined" ? `${window.location.origin}/library` : undefined,
      },
    })
    if (error) throw new Error(error.message)
    // Fără sesiune imediată ⇒ Supabase așteaptă confirmarea pe email.
    return { needsConfirmation: !data.session }
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw new Error(error.message)
  }

  async function deleteAccount() {
    // RPC-ul (SECURITY DEFINER) șterge rândul din auth.users; cascadele curăță
    // tot conținutul. Vezi migrations/004_delete_user_rpc.sql.
    const { error } = await supabase.rpc("delete_user")
    if (error) throw new Error(error.message)
    // Sesiunea locală e acum invalidă — o curățăm. (Ignorăm eroarea de signOut:
    // contul oricum nu mai există.)
    await supabase.auth.signOut().catch(() => {})
  }

  return (
    <AuthContext.Provider
      value={{
        user: session?.user ?? null,
        session,
        loading,
        signIn,
        signUp,
        signOut,
        deleteAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

/** Hook de acces la starea de autentificare. Aruncă dacă e folosit în afara provider-ului. */
export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth trebuie folosit în interiorul <AuthProvider>.")
  return ctx
}
