"use client"

/**
 * /settings — setările contului.
 *
 * Secțiuni (de sus în jos):
 *   - Account: emailul curent (read-only)
 *   - Change email: Supabase trimite un link de confirmare; emailul nou devine
 *     activ abia după click
 *   - Change password: cere parola curentă (re-autentificare), apoi pe cea nouă
 *   - Sign out
 *   - Danger zone (mutate aici din /library):
 *       „Delete all my data" — șterge toate cărțile, contul rămâne
 *       „Delete my account" — GDPR erasure real: cont + tot conținutul
 *
 * Toată logica de auth stă în AuthContext; pagina doar strânge input-ul și
 * afișează erorile/confirmările.
 */

import { useState, type FormEvent, type ReactNode } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, LogOut } from "lucide-react"
import { RequireAuth } from "@/components/auth/RequireAuth"
import { useAuth } from "@/context/AuthContext"
import { deleteAllMyData } from "@/hooks/use-tessera-data"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

const labelClass =
  "mb-1.5 block text-xs uppercase tracking-[0.15em] text-muted-foreground"
const inputClass =
  "w-full rounded border border-border bg-card/40 px-3 py-2.5 font-serif text-foreground outline-none transition-colors focus:border-primary"
const submitClass =
  "rounded border border-border px-4 py-2 font-serif text-sm text-foreground/90 transition-colors hover:bg-secondary/50 disabled:cursor-not-allowed disabled:opacity-50"

/** Mesajele de sub formulare — același stil ca în AuthForm. */
function Message({ kind, testId, children }: { kind: "error" | "info"; testId: string; children: ReactNode }) {
  return (
    <p
      data-testid={testId}
      className={
        kind === "error"
          ? "rounded border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm italic text-destructive"
          : "rounded border border-border bg-card/40 px-3 py-2 text-sm italic text-muted-foreground"
      }
    >
      {children}
    </p>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-border pt-6">
      <h2 className="mb-4 font-serif text-lg italic text-foreground">{title}</h2>
      {children}
    </section>
  )
}

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback
}

export default function SettingsPage() {
  const router = useRouter()
  const { user, signOut, updateEmail, updatePassword, deleteAccount } = useAuth()

  // --- Change email ---
  const [newEmail, setNewEmail] = useState("")
  const [emailSaving, setEmailSaving] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [emailInfo, setEmailInfo] = useState<string | null>(null)

  async function handleEmailSubmit(event: FormEvent) {
    event.preventDefault()
    if (emailSaving) return
    setEmailError(null)
    setEmailInfo(null)
    const email = newEmail.trim()
    if (email.toLowerCase() === user?.email?.toLowerCase()) {
      setEmailError("That’s already your email.")
      return
    }
    setEmailSaving(true)
    try {
      await updateEmail(email)
      setEmailInfo(`Check your inbox — we sent a confirmation link to ${email}.`)
      setNewEmail("")
    } catch (err) {
      setEmailError(errorMessage(err, "Couldn't change your email."))
    } finally {
      setEmailSaving(false)
    }
  }

  // --- Change password ---
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordInfo, setPasswordInfo] = useState<string | null>(null)

  async function handlePasswordSubmit(event: FormEvent) {
    event.preventDefault()
    if (passwordSaving) return
    setPasswordError(null)
    setPasswordInfo(null)
    if (newPassword.length < 6) {
      setPasswordError("The new password needs at least 6 characters.")
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("The new passwords don’t match.")
      return
    }
    setPasswordSaving(true)
    try {
      await updatePassword(currentPassword, newPassword)
      setPasswordInfo("Your password has been changed.")
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
    } catch (err) {
      setPasswordError(errorMessage(err, "Couldn't change your password."))
    } finally {
      setPasswordSaving(false)
    }
  }

  // --- Sign out ---
  async function handleSignOut() {
    await signOut()
    router.replace("/login")
  }

  // --- „Delete all my data" (GDPR right to erasure, promis în /privacy) ---
  const [wipeOpen, setWipeOpen] = useState(false)
  const [wiping, setWiping] = useState(false)
  const [wipeError, setWipeError] = useState<string | null>(null)
  const [wipeDone, setWipeDone] = useState(false)

  async function confirmWipe() {
    if (wiping) return
    setWiping(true)
    setWipeError(null)
    try {
      await deleteAllMyData()
      setWipeOpen(false)
      setWipeDone(true)
    } catch (err) {
      setWipeError(errorMessage(err, "Couldn't delete your data."))
    } finally {
      setWiping(false)
    }
  }

  // --- „Delete my account" (GDPR erasure real: cont + tot conținutul) ---
  const [accountOpen, setAccountOpen] = useState(false)
  const [deletingAccount, setDeletingAccount] = useState(false)
  const [accountError, setAccountError] = useState<string | null>(null)

  async function confirmDeleteAccount() {
    if (deletingAccount) return
    setDeletingAccount(true)
    setAccountError(null)
    try {
      await deleteAccount()
      // Contul a dispărut — plecăm la login (nu mai avem sesiune).
      router.replace("/login")
    } catch (err) {
      setAccountError(errorMessage(err, "Couldn't delete your account."))
      setDeletingAccount(false)
    }
  }

  return (
    <RequireAuth>
    <div className="min-h-screen paper-texture">
      <header
        className="flex items-center justify-between gap-3 bg-accent px-4 py-3 sm:px-6"
        style={{ borderBottom: "0.5px solid var(--topbar-border)" }}
      >
        <h1
          data-testid="settings-title"
          className="font-serif text-lg italic tracking-wide text-primary sm:text-xl"
        >
          tessera · settings
        </h1>
        <Link
          href="/library"
          className="flex items-center gap-2 rounded border border-border px-3 py-1.5 font-serif text-xs text-foreground/90 transition-colors hover:bg-secondary/50 sm:text-sm"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          library
        </Link>
      </header>

      <main className="mx-auto flex max-w-xl flex-col gap-8 px-4 py-8 sm:px-6">
        {/* Account */}
        <section>
          <p className={labelClass}>Signed in as</p>
          <p data-testid="settings-current-email" className="font-serif text-base text-foreground">
            {user?.email}
          </p>
        </section>

        {/* Change email */}
        <Section title="Change email">
          <form onSubmit={handleEmailSubmit} className="space-y-4" data-testid="settings-email-form">
            <div>
              <label htmlFor="new-email" className={labelClass}>New email</label>
              <input
                id="new-email"
                data-testid="settings-new-email"
                type="email"
                autoComplete="email"
                required
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className={inputClass}
                placeholder="you@example.com"
              />
            </div>
            {emailError && <Message kind="error" testId="settings-email-error">{emailError}</Message>}
            {emailInfo && <Message kind="info" testId="settings-email-info">{emailInfo}</Message>}
            <button type="submit" disabled={emailSaving} data-testid="settings-email-submit" className={submitClass}>
              {emailSaving ? "saving…" : "change email"}
            </button>
          </form>
        </Section>

        {/* Change password */}
        <Section title="Change password">
          <form onSubmit={handlePasswordSubmit} className="space-y-4" data-testid="settings-password-form">
            <div>
              <label htmlFor="current-password" className={labelClass}>Current password</label>
              <input
                id="current-password"
                data-testid="settings-current-password"
                type="password"
                autoComplete="current-password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="new-password" className={labelClass}>New password</label>
              <input
                id="new-password"
                data-testid="settings-new-password"
                type="password"
                autoComplete="new-password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={inputClass}
                placeholder="At least 6 characters"
              />
            </div>
            <div>
              <label htmlFor="confirm-password" className={labelClass}>Confirm new password</label>
              <input
                id="confirm-password"
                data-testid="settings-confirm-password"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={inputClass}
              />
            </div>
            {passwordError && <Message kind="error" testId="settings-password-error">{passwordError}</Message>}
            {passwordInfo && <Message kind="info" testId="settings-password-info">{passwordInfo}</Message>}
            <button type="submit" disabled={passwordSaving} data-testid="settings-password-submit" className={submitClass}>
              {passwordSaving ? "saving…" : "change password"}
            </button>
          </form>
        </Section>

        {/* Sign out */}
        <Section title="Session">
          <button
            onClick={handleSignOut}
            data-testid="settings-signout"
            className="flex items-center gap-2 rounded border border-border px-4 py-2 font-serif text-sm text-foreground/90 transition-colors hover:bg-secondary/50"
          >
            <LogOut className="h-3.5 w-3.5" />
            sign out
          </button>
        </Section>

        {/* Danger zone */}
        <Section title="Danger zone">
          <p className="mb-4 font-serif text-sm italic text-muted-foreground">
            Remove every book you’ve created but keep your account — or delete
            the account itself, together with everything in it.
          </p>
          {wipeDone && (
            <div className="mb-4">
              <Message kind="info" testId="settings-wipe-info">
                All your books have been deleted.
              </Message>
            </div>
          )}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => {
                setWipeError(null)
                setWipeOpen(true)
              }}
              data-testid="settings-delete-data"
              className="rounded border border-destructive/60 px-4 py-2 font-serif text-sm italic text-destructive transition-colors hover:bg-destructive/10"
            >
              Delete all my data
            </button>
            <button
              onClick={() => {
                setAccountError(null)
                setAccountOpen(true)
              }}
              data-testid="settings-delete-account"
              className="rounded border border-destructive/60 px-4 py-2 font-serif text-sm italic text-destructive transition-colors hover:bg-destructive/10"
            >
              Delete my account
            </button>
          </div>
        </Section>
      </main>

      {/* „Delete all my data" — confirmarea GDPR right to erasure. */}
      <AlertDialog
        open={wipeOpen}
        onOpenChange={(open) => {
          if (!open && !wiping) {
            setWipeOpen(false)
            setWipeError(null)
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif italic">
              Delete all your data?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes <em>every book</em> you’ve created, along
              with all their characters, relationships, and fragments. Your
              account stays, but its library will be empty. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {wipeError && (
            <p className="text-sm italic text-destructive">{wipeError}</p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={wiping}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                void confirmWipe()
              }}
              disabled={wiping}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {wiping ? "Deleting…" : "Delete everything"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={accountOpen}
        onOpenChange={(open) => {
          if (!open && !deletingAccount) {
            setAccountOpen(false)
            setAccountError(null)
          }
        }}
      >
        <AlertDialogContent data-testid="settings-delete-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif italic">
              Delete your account?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes <em>your account</em> and{" "}
              <em>everything in it</em> — all your books, characters,
              relationships and fragments. You will be signed out and cannot log
              back in with this account. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {accountError && (
            <p className="text-sm italic text-destructive">{accountError}</p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingAccount} data-testid="settings-delete-cancel">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault() // nu închide dialogul până nu termină delete-ul
                void confirmDeleteAccount()
              }}
              disabled={deletingAccount}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingAccount ? "Deleting…" : "Delete my account"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    </RequireAuth>
  )
}
