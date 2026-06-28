/**
 * Imagine de Open Graph generată dinamic, dark academia.
 *
 * Next.js o expune automat la /opengraph-image pentru toate paginile (până
 * când o pagină definește una proprie). Convențiile: 1200×630 (Facebook/X),
 * exportă size + contentType + default function care întoarce un JSX random.
 *
 * Folosim ImageResponse (built-in în next/og) ca să randăm JSX → PNG la build.
 * Nu pot folosi clase Tailwind aici, doar style inline.
 */

import { ImageResponse } from "next/og"

export const runtime = "edge"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

// Paleta dark academia, ținută inline (acest fișier rulează pe edge, fără CSS).
const COLOR_BG = "#1a1410"
const COLOR_CARD = "#221a13"
const COLOR_ACCENT = "#8a7656"
const COLOR_CREAM = "#e8dcc4"
const COLOR_OCHRE = "#8a6a28"

export default async function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: COLOR_BG,
          fontFamily: "Georgia, serif",
          padding: 80,
        }}
      >
        {/* Cadrul subtil — sugerează o filă de manuscris vechi */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            border: `1px solid ${COLOR_ACCENT}55`,
            borderRadius: 8,
            background: COLOR_CARD,
            padding: "80px 120px",
            boxShadow: "0 10px 40px rgba(0,0,0,0.4)",
          }}
        >
          <p
            style={{
              fontSize: 22,
              letterSpacing: 14,
              textTransform: "uppercase",
              color: COLOR_ACCENT,
              margin: 0,
              marginBottom: 32,
            }}
          >
            tessera
          </p>

          <h1
            style={{
              fontSize: 88,
              fontStyle: "italic",
              color: COLOR_CREAM,
              margin: 0,
              textAlign: "center",
              lineHeight: 1.1,
            }}
          >
            A literary moodboard.
          </h1>

          <p
            style={{
              fontSize: 28,
              fontStyle: "italic",
              color: COLOR_OCHRE,
              marginTop: 36,
              marginBottom: 0,
              textAlign: "center",
              maxWidth: 800,
            }}
          >
            characters · nicknames · relationships · atmosphere
          </p>
        </div>
      </div>
    ),
    { ...size },
  )
}
