"use client"

/**
 * useUnsplashTracking — pingează endpoint-ul de download Unsplash o singură dată
 * pe sesiune, când userul „folosește" efectiv imaginea.
 *
 * Regula Unsplash: la prima interacțiune semnificativă cu o imagine (hover
 * prelungit > 2s, click, share), trebuie să facem un apel către
 * `links.download_location` al imaginii. Apelul e proxat prin
 * `/api/unsplash/track` ca să nu expunem cheia API în client.
 *
 * Funcționare:
 *   - `fired` (Set la nivel de modul) ține minte ce `downloadLocation`-uri am
 *     mai pingat în această sesiune; nu pingăm același URL de două ori.
 *   - `onMouseEnter` pornește un timer de 2s. Dacă userul stă pe imagine atât,
 *     pingăm.
 *   - `onMouseLeave` anulează timer-ul (userul a trecut peste, nu a stat).
 *   - `onClick` pingează imediat (e o interacțiune clară).
 *
 * Întoarce un obiect cu handlerele pe care le punem direct pe DOM:
 *   <div onMouseEnter={t.onMouseEnter} onMouseLeave={t.onMouseLeave} onClick={t.onClick}>
 *
 * Dacă `downloadLocation` lipsește (imagine non-Unsplash), handlerele sunt
 * no-op — îți poți pune nepăsător hook-ul pe orice fragment de imagine.
 */

import { useCallback, useEffect, useRef } from "react"

/** Câte ms de hover continuu numără ca „folosire" (cerința e > 2 secunde). */
const HOVER_THRESHOLD_MS = 2000

/** URL-uri deja pingate în sesiunea curentă, ca să nu trimitem dublu.
 *  Module-scope intenționat: e împărțit între TOATE instanțele hook-ului. */
const fired = new Set<string>()

export function useUnsplashTracking(downloadLocation: string | undefined) {
  // Timer-ul de hover; ref ca să-l putem anula din mouseLeave fără re-render.
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Pingul real: idempotent pe sesiune, în liniște dacă pică.
  const ping = useCallback(() => {
    if (!downloadLocation) return
    if (fired.has(downloadLocation)) return
    fired.add(downloadLocation)
    // fire-and-forget; nu blocăm UI-ul pe răspunsul Unsplash.
    void fetch("/api/unsplash/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ downloadLocation }),
    }).catch(() => {
      // dacă rețeaua a picat, scoatem URL-ul din set ca să încercăm data viitoare
      fired.delete(downloadLocation)
    })
  }, [downloadLocation])

  // Curățăm timer-ul dacă utilizatorul navighează (componenta dispare).
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const onMouseEnter = useCallback(() => {
    if (!downloadLocation) return
    if (fired.has(downloadLocation)) return // deja pingat, nu mai pornim timer
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(ping, HOVER_THRESHOLD_MS)
  }, [downloadLocation, ping])

  const onMouseLeave = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const onClick = useCallback(() => {
    ping()
  }, [ping])

  return { onMouseEnter, onMouseLeave, onClick }
}
