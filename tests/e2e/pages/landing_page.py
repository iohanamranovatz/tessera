"""LandingPage — ruta `/`, hero-ul cinematic."""

from __future__ import annotations

from selenium.webdriver.common.by import By

from .base_page import BasePage


class LandingPage(BasePage):
    path = "/"

    # -- elemente ----------------------------------------------------------- #
    @property
    def hero(self):
        return self.find("landing-hero")

    @property
    def title(self):
        return self.find("landing-title")

    @property
    def tagline(self):
        return self.find("landing-tagline")

    @property
    def primary_cta(self):
        return self.find("landing-cta-primary")

    @property
    def signin_cta(self):
        return self.find("landing-cta-signin")

    # -- așteptări ---------------------------------------------------------- #
    def wait_for_entrance(self, timeout: int | None = None) -> "LandingPage":
        """Așteaptă să se termine animația de intrare a hero-ului.

        Titlul, tagline-ul, butoanele și cele 9 fragmente intră eșalonat, pe
        parcursul a ~2.5s (`animation-delay` crescător, cu `fill: both` — deci
        înainte de rândul lor sunt la `opacity: 0`). Citit mai devreme,
        `hero.text` întoarce doar fragmente de text, iar fragmentele plutitoare
        par că lipsesc.

        Condiția: TOATE elementele animate să fi ajuns la opacitate plină.
        Funcționează și cu `prefers-reduced-motion`, unde intră instant.
        """
        self._wait(timeout).until(
            lambda d: d.execute_script(
                """
                const nodes = document.querySelectorAll(
                  '[data-testid="landing-hero"] .landing-enter'
                );
                if (nodes.length === 0) return false;
                return [...nodes].every(
                  (n) => parseFloat(getComputedStyle(n).opacity) > 0.99
                );
                """
            ),
            "Landing entrance animation never finished",
        )
        return self

    # -- interogări --------------------------------------------------------- #
    def title_text(self) -> str:
        """Textul titlului.

        Titlul e spart literă cu literă pentru animație, plus un `sr-only`
        pentru cititoarele de ecran — deci `.text` poate întoarce „tesseratessera".
        Citim doar varianta pentru cititoare, care e cuvântul întreg o dată.
        """
        return self.title.find_element(By.CSS_SELECTOR, ".sr-only").text.strip()

    def fragment_count(self) -> int:
        """Câte fragmente plutitoare sunt VIZIBILE la lățimea curentă.

        Pe mobil o parte sunt ascunse prin `hidden sm:block`, deci numărul
        diferă intenționat între desktop și telefon.
        """
        layer = self.find("landing-fragments")
        return sum(
            1
            for card in layer.find_elements(By.CSS_SELECTOR, ".landing-fragment")
            if card.is_displayed()
        )

    def hero_height(self) -> int:
        """Înălțimea hero-ului în px — trebuie să fie ~un viewport."""
        return self.hero.size["height"]

    def page_scroll_width(self) -> int:
        """Lățimea de scroll a documentului, pentru testul de overflow lateral."""
        return self.driver.execute_script("return document.documentElement.scrollWidth")

    def viewport_width(self) -> int:
        return self.driver.execute_script("return window.innerWidth")

    # -- acțiuni ------------------------------------------------------------ #
    def go_primary(self) -> None:
        self.click("landing-cta-primary")

    def go_signin(self) -> None:
        self.click("landing-cta-signin")
