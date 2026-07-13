/**
 * /terms — Terms of Service (bilingv: English + Română).
 *
 * Pagină statică. Vezi nota din /privacy/page.tsx — aceleași placeholdere
 * [DOMENIU] și [EMAIL] trebuie înlocuite înainte de lansare publică.
 */

import type { Metadata } from "next"
import Link from "next/link"

const LAST_UPDATED = "2026-06-28"

export const metadata: Metadata = {
  title: "Terms of Service — Tessera",
  description: "The rules for using Tessera.",
}

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16 font-serif text-foreground">
      <p className="mb-2 text-xs italic text-muted-foreground">
        Last updated: {LAST_UPDATED}
      </p>
      <h1 className="mb-10 font-serif text-4xl italic">Terms of Service</h1>

      {/* ============================================================ */}
      {/* ENGLISH                                                       */}
      {/* ============================================================ */}
      <section className="mb-16 space-y-6 leading-relaxed">
        <h2 className="border-b border-border pb-2 font-serif text-2xl italic">
          English
        </h2>

        <p>
          By using Tessera, you accept
          these terms. They are deliberately short. If anything is unclear,
          please ask before relying on it.
        </p>

        <h3 className="font-serif text-xl italic">1. What Tessera is for</h3>
        <p>
          Tessera is a personal, non-commercial tool for keeping a literary
          moodboard — characters, relationships, fragments. Use it for your
          own reading. Do not resell access or wrap it in a paid product
          without our written permission.
        </p>

        <h3 className="font-serif text-xl italic">2. The content you add</h3>
        <p>
          You keep the rights to the text you write (descriptions, tags,
          notes). By saving it in Tessera, you give us the technical
          permission to store and display it back to you. Don't add content
          that you don't have the right to use — for example, do not paste
          long passages from a copyrighted novel; short, transformative
          quotes are fine.
        </p>

        <h3 className="font-serif text-xl italic">3. AI-generated content</h3>
        <p>
          Tessera uses an AI model (currently Google Gemini) to suggest
          characters, relationships and image queries. AI output{" "}
          <strong>can be wrong</strong> names misspelled, plot details
          confused, occasional spoilers from later chapters. Always check
          against the book itself before treating an AI suggestion as fact.
          You are responsible for the content you save.
        </p>

        <h3 className="font-serif text-xl italic">4. Images and credits</h3>
        <p>
          Images displayed in fragments come from external sources (museums,
          Wikimedia Commons, Europeana, Openverse, Unsplash). They remain the
          property of their respective rights-holders. We only show images
          whose licence allows it. Where credit is required (e.g. Unsplash),
          we show it on hover.
        </p>

        <h3 className="font-serif text-xl italic">5. No warranty</h3>
        <p>
          Tessera is provided <em>as is</em>, without any warranty. The
          service may go down, lose data, or behave unexpectedly. Don't store
          anything in it that you can't afford to lose. To the extent
          permitted by law, we are not liable for any damages arising from
          your use of the service.
        </p>

        <h3 className="font-serif text-xl italic">
          6. Copyright complaints (DMCA-style)
        </h3>
        <p>
          If you believe content displayed in Tessera infringes your
          copyright, send a notice to{""}
          <a className="italic underline" href="mailto:[EMAIL]">
            mranovatzbrigi@gmail.com
          </a>{" "}
          including:
        </p>
        <ul className="list-disc space-y-1 pl-6">
          <li>Identification of the work you own;</li>
          <li>The URL or screenshot of where it appears on Tessera;</li>
          <li>Your contact information;</li>
          <li>
            A statement that you believe in good faith the use is not
            authorized;
          </li>
          <li>
            A statement, under penalty of perjury, that the information is
            accurate and that you are the rights-holder or authorized to act
            on their behalf.
          </li>
        </ul>
        <p>
          We will review the notice and remove or restrict the content as
          appropriate.
        </p>

        <h3 className="font-serif text-xl italic">7. Changes to these terms</h3>
        <p>
          We may change these terms when the app changes. The date at the top
          will reflect the latest revision. If a change is significant, we
          will mention it in the app the next time you open it.
        </p>

        <h3 className="font-serif text-xl italic">8. Contact</h3>
        <p>
          For anything else, write to{" "}
          <a className="italic underline" href="mailto:[EMAIL]">
            mranovatzbrigi@gmail.com
          </a>
          .
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
          Folosind Tessera accepți
          acești termeni. Sunt scurți intenționat. Dacă ceva nu e clar,
          întreabă înainte să te bazezi pe el.
        </p>

        <h3 className="font-serif text-xl italic">1. La ce e Tessera</h3>
        <p>
          Tessera e o unealtă personală, non-comercială, pentru a ține un
          moodboard literar — personaje, relații, fragmente. Folosește-o
          pentru lectura ta. Nu revinde accesul și nu o include într-un
          produs plătit fără permisiunea noastră scrisă.
        </p>

        <h3 className="font-serif text-xl italic">
          2. Conținutul pe care îl adaugi
        </h3>
        <p>
          Rămâi proprietar pe textele tale (descrieri, etichete, note). Prin
          salvarea lor în Tessera, ne dai permisiunea tehnică de a le stoca
          și a ți le afișa înapoi. Nu adăuga conținut pentru care nu ai
          drepturi — de exemplu, nu lipi pagini întregi dintr-un roman aflat
          sub copyright; citate scurte, transformative, sunt OK.
        </p>

        <h3 className="font-serif text-xl italic">
          3. Conținut generat de AI
        </h3>
        <p>
          Tessera folosește un model AI (momentan Google Gemini) ca să
          sugereze personaje, relații și interogări de imagine. Rezultatul
          AI-ului <strong>poate fi greșit</strong> — nume scrise prost,
          detalii de intrigă încurcate, uneori spoilere din capitole mai
          târzii. Verifică mereu cu cartea însăși înainte să tratezi o
          sugestie AI ca fapt. Tu ești responsabil pentru conținutul pe care
          îl salvezi.
        </p>

        <h3 className="font-serif text-xl italic">4. Imagini și atribuire</h3>
        <p>
          Imaginile afișate în fragmente provin din surse externe (muzee,
          Wikimedia Commons, Europeana, Openverse, Unsplash). Rămân
          proprietatea deținătorilor de drepturi. Afișăm doar imagini a
          căror licență ne permite. Acolo unde atribuirea e cerută (ex:
          Unsplash), o arătăm la hover.
        </p>

        <h3 className="font-serif text-xl italic">5. Fără garanție</h3>
        <p>
          Tessera e oferită <em>așa cum e</em>, fără nicio garanție.
          Serviciul poate cădea, poate pierde date, sau se poate comporta
          neprevăzut. Nu păstra în el nimic ce nu îți poți permite să
          pierzi. În măsura permisă de lege, nu suntem responsabili pentru
          niciun fel de daune din folosirea serviciului.
        </p>

        <h3 className="font-serif text-xl italic">
          6. Sesizări de copyright (stil DMCA)
        </h3>
        <p>
          Dacă crezi că un conținut afișat în Tessera îți încalcă
          copyright-ul, trimite o sesizare la{" "}
          <a className="italic underline" href="mailto:[EMAIL]">
            mranovatzbrigi@gmail.com
          </a>{" "}
          cu:
        </p>
        <ul className="list-disc space-y-1 pl-6">
          <li>Identificarea operei al cărei autor ești;</li>
          <li>URL-ul sau o captură unde apare în Tessera;</li>
          <li>Datele tale de contact;</li>
          <li>
            O declarație că, după buna ta credință, folosirea nu e
            autorizată;
          </li>
          <li>
            O declarație, sub responsabilitate proprie, că informația e
            corectă și că ești titularul drepturilor sau autorizat să
            acționezi în numele lui.
          </li>
        </ul>
        <p>
          Vom analiza sesizarea și vom elimina sau restricționa conținutul
          după caz.
        </p>

        <h3 className="font-serif text-xl italic">7. Modificări la termeni</h3>
        <p>
          Putem schimba acești termeni când aplicația se schimbă. Data din
          capul paginii reflectă ultima revizie. Dacă schimbarea e
          importantă, o vom menționa în aplicație la următoarea deschidere.
        </p>

        <h3 className="font-serif text-xl italic">8. Contact</h3>
        <p>
          Pentru orice altceva, scrie la{" "}
          <a className="italic underline" href="mailto:[EMAIL]">
            mranovatzbrigi@gmail.com
          </a>
          .
        </p>
      </section>

      <nav className="mt-16 border-t border-border pt-6 text-sm italic text-muted-foreground">
        <Link className="hover:text-foreground" href="/">
          ← Back to Tessera
        </Link>
        <span className="mx-3">·</span>
        <Link className="hover:text-foreground" href="/privacy">
          Privacy Policy
        </Link>
      </nav>
    </main>
  )
}
