import { LandingHero } from "@/components/landing/LandingHero"

/**
 * Root route `/` — pagina de intrare.
 *
 * Până la STAGIUL ăsta ruta doar redirecta spre /library, deci un vizitator nou
 * ajungea direct în zidul de autentificare, fără să afle ce e Tessera. Acum
 * primește hero-ul cinematic, de unde poate merge la /signup sau /login.
 *
 * Rămâne server component: tot ce e interactiv (parallax, starea sesiunii) stă
 * în LandingHero, care e „use client".
 */
export default function Home() {
  return <LandingHero />
}
