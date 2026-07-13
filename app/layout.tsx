import type { Metadata } from 'next'
import { Playfair_Display, Lora } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { Footer } from '@/components/layout/Footer'
import { AuthProvider } from '@/context/AuthContext'
import './globals.css'

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: '--font-playfair',
  display: 'swap',
})

const lora = Lora({
  subsets: ["latin"],
  variable: '--font-lora',
  display: 'swap',
})

// Domeniul canonic — folosit în metadataBase pentru ca toate URL-urile relative
// din OG/Twitter (mai ales imaginea) să devină absolute. Înlocuiește când ai
// domeniul real. Trebuie să fie absolut (cu protocol).
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://tessera.example.com'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'Tessera — Literary Moodboard',
  description:
    'A dark-academia moodboard for readers of long novels — characters, nicknames, relationships, atmosphere.',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
  // Open Graph — folosit pentru preview pe Facebook, Discord, Slack, WhatsApp.
  // `images` e relativă; Next.js generează automat ruta /opengraph-image din
  // fișierul app/opengraph-image.tsx (vezi acolo).
  openGraph: {
    type: 'website',
    title: 'Tessera — Literary Moodboard',
    description:
      'A dark-academia moodboard for readers of long novels — characters, nicknames, relationships, atmosphere.',
    siteName: 'Tessera',
    locale: 'en_US',
  },
  // Twitter folosește meta tag-uri separate (chiar dacă majoritatea preluă din OG).
  twitter: {
    card: 'summary_large_image',
    title: 'Tessera — Literary Moodboard',
    description:
      'A dark-academia moodboard for readers of long novels — characters, nicknames, relationships, atmosphere.',
  },
  // Lasă crawlerele să indexeze, dar nu lasă AI-uri să citească liber.
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${playfair.variable} ${lora.variable} bg-background`}>
      <body className="font-sans antialiased min-h-screen flex flex-col">
        <AuthProvider>
          <div className="flex-1">{children}</div>
          <Footer />
        </AuthProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
