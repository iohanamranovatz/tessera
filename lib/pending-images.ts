/**
 * pending-images.ts — predă „munca de imagini" de la onboarding către board.
 *
 * Problema: căutarea imaginilor durează ~30s. Nu vrem să blocăm ecranul final de
 * onboarding atâta timp. Soluția: la salvare, lăsăm un bilețel în sessionStorage
 * cu ce personaje au nevoie de imagini, apoi deschidem board-ul IMEDIAT. Board-ul
 * ridică bilețelul și face căutarea în fundal, afișând imaginile pe măsură ce vin.
 *
 * De ce sessionStorage (nu DB, nu context): supraviețuiește navigării către
 * /book/... (unde contextul de onboarding moare), dar dispare când se închide
 * tab-ul — exact cât ne trebuie pentru un transfer de o singură dată.
 */

/** Un personaj care așteaptă imagini: id-ul lui din DB + query-urile vizuale. */
export interface PendingCharacter {
  id: string
  imageQueries: string[]
}

/** Biletul lăsat de onboarding pentru board. */
export interface PendingImageWork {
  bookId: string
  characters: PendingCharacter[]
}

const KEY = "tessera:pending-images"

/** Lasă biletul (apelat de onboarding, înainte de a deschide board-ul). */
export function setPendingImages(work: PendingImageWork): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(work))
  } catch {
    /* sessionStorage indisponibil — pur și simplu nu vor apărea imagini auto */
  }
}

/**
 * Ridică ȘI șterge biletul, dar numai dacă e pentru cartea cerută.
 * Ștergerea imediată previne dubla generare (ex: efectele din React strict mode).
 */
export function takePendingImages(bookId: string): PendingImageWork | null {
  try {
    const raw = sessionStorage.getItem(KEY)
    if (!raw) return null
    const work = JSON.parse(raw) as PendingImageWork
    if (work.bookId !== bookId) return null
    sessionStorage.removeItem(KEY)
    return work
  } catch {
    return null
  }
}
