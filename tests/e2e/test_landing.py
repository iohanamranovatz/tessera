"""Landing page (`/`) — hero-ul cinematic.

Ruta asta e singura pagină publică a aplicației, deci e și singura pe care o
putem testa în profunzime fără Supabase configurat.

Ce verificăm: că hero-ul e acolo și e UN SINGUR ecran, că titlul și ambele
butoane există, că nu apare scroll orizontal (nici la 375px), și că setarea
„reduced motion" oprește animațiile fără să ascundă conținutul.
"""

from __future__ import annotations

import pytest

from pages import LandingPage


@pytest.fixture()
def landing(driver, base_url) -> LandingPage:
    page = LandingPage(driver, base_url).open()
    page.wait_for_hydration()
    # Hero-ul intră eșalonat pe ~2.5s; fără asta citim o pagină pe jumătate
    # apărută și testele devin instabile.
    page.wait_for_entrance()
    return page  # type: ignore[return-value]


class TestHero:
    def test_hero_renders(self, landing: LandingPage):
        """Hero-ul există și e vizibil — adică `/` nu mai redirecționează."""
        assert landing.hero.is_displayed()

    def test_title_is_tessera(self, landing: LandingPage):
        """Titlul citește „tessera" (din varianta pentru cititoare de ecran)."""
        assert landing.title_text() == "tessera"

    def test_tagline_describes_the_product(self, landing: LandingPage):
        """Un vizitator nou află din hero ce face aplicația.

        Era problema de la care am pornit: `/` ducea direct în zidul de login,
        fără nicio explicație.
        """
        text = landing.tagline.text.lower()
        assert "moodboard" in text
        assert "novels" in text

    def test_hero_is_one_viewport_tall(self, landing: LandingPage):
        """„Un singur ecran": hero-ul ocupă ~toată înălțimea vizibilă.

        Toleranță generoasă (±15%) — `100svh` diferă de `window.innerHeight`
        când browser-ul are bare dinamice.
        """
        viewport = landing.driver.execute_script("return window.innerHeight")
        assert landing.hero_height() == pytest.approx(viewport, rel=0.15)

    def test_floating_fragments_are_present(self, landing: LandingPage):
        """Colajul animat există — partea „dinamică" a paginii."""
        assert landing.fragment_count() >= 5

    def test_fragments_use_no_network_images(self, landing: LandingPage):
        """Colajul e SVG inline, nu <img>.

        Hero-ul trebuie să se picteze instant: ar fi absurd ca pagina de intrare
        să aștepte imagini de pe rețea exact în proiectul unde am reparat
        latența imaginilor.
        """
        images = landing.find("landing-fragments").find_elements("css selector", "img")
        assert images == []

    def test_decorative_layer_is_hidden_from_screen_readers(self, landing: LandingPage):
        """Colajul e decor, deci `aria-hidden` — nu zgomot pentru cititoare."""
        layer = landing.driver.find_element(
            "css selector", '[data-testid="landing-fragments"]'
        )
        assert layer.get_attribute("aria-hidden") == "true"


class TestCallsToAction:
    def test_both_ctas_are_visible_when_signed_out(self, landing: LandingPage):
        assert landing.primary_cta.is_displayed()
        assert landing.signin_cta.is_displayed()

    def test_primary_cta_points_to_signup(self, landing: LandingPage):
        """Vizitator nelogat ⇒ butonul principal duce la înregistrare."""
        assert landing.primary_cta.get_attribute("href").endswith("/signup")

    def test_signin_cta_points_to_login(self, landing: LandingPage):
        assert landing.signin_cta.get_attribute("href").endswith("/login")


class TestResponsive:
    def test_no_horizontal_overflow_on_desktop(self, landing: LandingPage):
        """Nimic nu împinge pagina lateral.

        Fragmentele sunt poziționate absolut lângă margini, deci e exact genul
        de layout care scapă ușor un scrollbar orizontal.
        """
        assert landing.page_scroll_width() <= landing.viewport_width() + 1

    def test_mobile_layout_holds(self, driver, base_url):
        """La 375×812 (iPhone) hero-ul rămâne un ecran, fără overflow."""
        original = driver.get_window_size()
        try:
            driver.set_window_size(375, 812)
            page = LandingPage(driver, base_url).open()
            page.wait_for_hydration()
            page.wait_for_entrance()

            assert page.hero.is_displayed()
            assert page.page_scroll_width() <= page.viewport_width() + 1
            # Pe mobil ascundem intenționat o parte din fragmente, ca să nu se
            # îngrămădească peste titlu — deci mai puține decât pe desktop.
            assert 0 < page.fragment_count() <= 6
        finally:
            driver.set_window_size(original["width"], original["height"])


class TestReducedMotion:
    def test_animations_stop_but_content_stays(self, driver, base_url):
        """`prefers-reduced-motion: reduce` îngheață compoziția, nu o ascunde.

        Greșeala ușoară aici e să dezactivezi animația de intrare și să rămâi
        cu conținut la `opacity: 0` — adică o pagină goală exact pentru userii
        care au cerut mai puțină mișcare. Verificăm că titlul e opac.
        """
        driver.execute_cdp_cmd(
            "Emulation.setEmulatedMedia",
            {"features": [{"name": "prefers-reduced-motion", "value": "reduce"}]},
        )
        try:
            page = LandingPage(driver, base_url).open()
            page.wait_for_hydration()
            page.wait_for_entrance()

            title = page.title
            assert title.is_displayed()

            opacity = driver.execute_script(
                "return getComputedStyle(arguments[0]).opacity", title
            )
            assert float(opacity) == pytest.approx(1.0, abs=0.01)

            # Și fragmentele: vizibile, dar fără animație care rulează.
            card = driver.find_element("css selector", ".landing-fragment")
            animation = driver.execute_script(
                "return getComputedStyle(arguments[0]).animationName", card
            )
            assert animation == "none"
        finally:
            driver.execute_cdp_cmd("Emulation.setEmulatedMedia", {"features": []})
