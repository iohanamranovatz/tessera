/**
 * /privacy — Privacy Policy (bilingv: English + Română).
 *
 * Pagină statică. Conținutul reflectă STAREA REALĂ a aplicației la momentul
 * scrierii (vezi STAGIUL 7.5.C). Când schimbi ceva important (alt LLM,
 * adaugi auth, schimbi storage), trebuie să actualizezi și pagina asta și
 * data `LAST_UPDATED` de mai jos.
 *
 * Placeholdere de înlocuit înainte de lansare publică:
 *   - [DOMENIU] → URL-ul real Vercel (ex: tessera.vercel.app)
 *   - [EMAIL]   → adresa de contact pentru GDPR / DMCA
 */

import type { Metadata } from "next"
import Link from "next/link"

const LAST_UPDATED = "2026-06-28"

export const metadata: Metadata = {
  title: "Privacy Policy — Tessera",
  description: "How Tessera handles your data.",
}

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16 font-serif text-foreground">
      <p className="mb-2 text-xs italic text-muted-foreground">
        Last updated: {LAST_UPDATED}
      </p>
      <h1 className="mb-10 font-serif text-4xl italic">Privacy Policy</h1>

      {/* ============================================================ */}
      {/* ENGLISH                                                       */}
      {/* ============================================================ */}
      <section className="mb-16 space-y-6 leading-relaxed">
        <h2 className="border-b border-border pb-2 font-serif text-2xl italic">
          English
        </h2>

        <p>
          Tessera is a small, personal moodboard for readers, a quiet place to
          keep track of characters, nicknames and relationships in the books
          you read. This page explains, in plain language, what data we handle
          and what we don't.
        </p>

        <h3 className="font-serif text-xl italic">What we collect</h3>
        <p>
          Only the literary content you create yourself: book titles and
          chapter progress, characters and their nicknames, descriptions and
          tags, relationships between characters, and the visual fragments
          (text or images) you pin to the collage board.
        </p>
        <h3 className="font-serif text-xl italic">How we store it</h3>
        <p>
          Your literary content is stored in a managed PostgreSQL database
          provided by <strong>Supabase</strong>. The Tessera web app itself
          runs on <strong>Vercel</strong>. Both providers may keep technical
          logs (e.g. request times, error traces) as part of their normal
          operation.
        </p>

        <h3 className="font-serif text-xl italic">Who we share it with</h3>
        <p>
          When you generate characters or fragments, parts of your content are
          sent to third-party services that make Tessera work:
        </p>
        <ul className="list-disc space-y-1 pl-6">
          <li>
            <strong>Google Gemini</strong> — book/chapter context is sent so
            the model can suggest characters and relationships.
          </li>
          <li>
            <strong>Wikipedia</strong> — book and character names are sent to
            retrieve grounding text and reduce AI hallucinations.
          </li>
          <li>
            <strong>Image sources</strong> — your image search queries
            (typically a character description) are sent to:{" "}
            <em>Metropolitan Museum of Art</em>, <em>Wikimedia Commons</em>,{" "}
            <em>Europeana</em>, <em>Openverse</em> and (when enabled){" "}
            <em>Unsplash</em>. We only display images we are legally allowed
            to use (Public Domain, CC0, or, for Unsplash, with on-screen
            credit).
          </li>
          <li>
            <strong>Vercel Analytics</strong> — when running in production,
            anonymous page-view metrics are collected by Vercel. No personal
            data, no cookies, no cross-site tracking.
          </li>
        </ul>
      
        <h3 className="font-serif text-xl italic">Cookies</h3>
        <p>
          Tessera does not set any tracking cookies of its own. Vercel
          Analytics is cookie-free by design.
        </p>

        <h3 className="font-serif text-xl italic">Your rights (GDPR)</h3>
        <p>
          If you are located in the European Union, GDPR gives you the right
          to access, correct or delete your data, to object to processing, and
          to lodge a complaint with your local data-protection authority.
        </p>
        <p>
          To delete the content you created in Tessera, open the in-app
          settings and use <em>“Delete all my data”</em>.
        </p>

        <h3 className="font-serif text-xl italic">Contact</h3>
        <p>
          For any privacy question or request, write to{" "}
          <a className="italic underline" href="mailto:[EMAIL]">
            mranovatzbrigi@gmail.com
          </a>
          .
        </p>

        <h3 className="font-serif text-xl italic">Changes</h3>
        <p>
          We may update this policy when the app changes. The date at the top
          will reflect the latest revision.
        </p>
      </section>

      {/* ============================================================ */}
      {/* ROMÂNĂ                                                        */}
      {/* ============================================================ */}
      <section className="space-y-6 leading-relaxed">
        <h2 className="border-b border-border pb-2 font-serif text-2xl italic">
          Română
        </h2>

        <p>
          Tessera e un moodboard mic, personal, pentru cititori — un loc liniștit
          unde să ții evidența personajelor, poreclelor și relațiilor din cărțile
          pe care le citești. Pagina asta explică, în cuvinte simple, ce date
          procesăm și ce nu.
        </p>

        <h3 className="font-serif text-xl italic">Ce colectăm</h3>
        <p>
          Doar conținutul literar pe care îl creezi tu: titluri de cărți și
          progresul pe capitole, personaje și poreclele lor, descrieri și
          etichete, relații dintre personaje, și fragmentele vizuale (text sau
          imagini) pe care le pui pe board.
        </p>

        <h3 className="font-serif text-xl italic">Unde stocăm</h3>
        <p>
          Conținutul tău literar e stocat într-o bază de date PostgreSQL găzduită
          de <strong>Supabase</strong>. Aplicația în sine rulează pe
          <strong>Vercel</strong>. Ambii furnizori pot păstra log-uri tehnice
          (timpi de cerere, urme de erori) ca parte din funcționarea lor.
        </p>

        <h3 className="font-serif text-xl italic">Cu cine partajăm</h3>
        <p>
          Când generezi personaje sau fragmente, părți din conținutul tău sunt
          trimise către servicii externe care fac Tessera să funcționeze:
        </p>
        <ul className="list-disc space-y-1 pl-6">
          <li>
            <strong>Google Gemini</strong> — primește contextul cărții și al
            capitolului ca să propună personaje și relații.
          </li>
          <li>
            <strong>Wikipedia</strong> — primește titlul cărții și numele
            personajelor ca să întoarcă text de referință (reduce
            halucinațiile AI).
          </li>
          <li>
            <strong>Surse de imagini</strong> — interogările tale de imagine
            (de obicei o descriere de personaj) ajung la:{" "}
            <em>Metropolitan Museum of Art</em>, <em>Wikimedia Commons</em>,{" "}
            <em>Europeana</em>, <em>Openverse</em> și (când e activat){" "}
            <em>Unsplash</em>. Afișăm doar imagini pe care avem dreptul să le
            folosim (Public Domain, CC0, sau, la Unsplash, cu atribuire pe
            ecran).
          </li>
          <li>
            <strong>Vercel Analytics</strong> — în producție, Vercel
            colectează metrici anonime de vizualizare. Fără date personale,
            fără cookies, fără tracking între site-uri.
          </li>
        </ul>
        <p>
          <strong>Nu vindem</strong> datele tale și nu le împărtășim cu nimeni
          pentru publicitate sau marketing.
        </p>

        <h3 className="font-serif text-xl italic">Cookies</h3>
        <p>
          Tessera nu setează cookies proprii de tracking. Vercel Analytics e
          fără cookies prin design.
        </p>

        <h3 className="font-serif text-xl italic">Drepturile tale (GDPR)</h3>
        <p>
          Dacă ești în Uniunea Europeană, GDPR îți dă dreptul să accesezi, să
          corectezi sau să ștergi datele tale, să te opui procesării, și să
          depui plângere la autoritatea națională de protecție a datelor
          (ANSPDCP în România).
        </p>
        <p>
          Pentru a șterge conținutul creat în Tessera, deschide setările
          aplicației și folosește <em>„Șterge toate datele mele"</em>.
        </p>

        <h3 className="font-serif text-xl italic">Contact</h3>
        <p>
          Pentru orice întrebare sau cerere legată de date, scrie la {""}
          <a className="italic underline" href="mailto:[EMAIL]">
            mranovatzbrigi@gmail.com
          </a>
          .
        </p>

        <h3 className="font-serif text-xl italic">Modificări</h3>
        <p>
          Putem actualiza politica când aplicația se schimbă. Data din capul
          paginii reflectă ultima revizie.
        </p>
      </section>

      <nav className="mt-16 border-t border-border pt-6 text-sm italic text-muted-foreground">
        <Link className="hover:text-foreground" href="/">
          ← Back to Tessera
        </Link>
        <span className="mx-3">·</span>
        <Link className="hover:text-foreground" href="/terms">
          Terms of Service
        </Link>
      </nav>
    </main>
  )
}
