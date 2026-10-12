"""Fluxul autentificat: login, redirect după login, sign out.

TOATE testele de aici sunt marcate `auth` și au nevoie de:
  * chei Supabase REALE în `.env.local` (vezi .env.example), și
  * un cont de test, prin TESSERA_TEST_EMAIL / TESSERA_TEST_PASSWORD.

Fără ele, fixture-ul `credentials` sare testele — suita rămâne verde pe o
instalare proaspătă, în loc să raporteze eșecuri care nu spun nimic.

    export TESSERA_TEST_EMAIL=you@example.com
    export TESSERA_TEST_PASSWORD=...
    pytest tests/e2e -m auth
"""

from __future__ import annotations

import pytest

from pages import LibraryPage, LoginPage
from pages.base_page import BasePage

pytestmark = pytest.mark.auth


class TestLogin:
    def test_valid_credentials_reach_the_library(self, driver, base_url, credentials):
        email, password = credentials
        page = LoginPage(driver, base_url).open()
        page.wait_for_hydration()
        page.login(email, password)

        page.wait_for_path("/library")
        assert LibraryPage(driver, base_url).title.is_displayed()

    def test_wrong_password_shows_an_error_and_stays_put(
        self, driver, base_url, credentials
    ):
        """Credențiale greșite ⇒ mesaj de eroare, fără redirect."""
        email, _ = credentials
        page = LoginPage(driver, base_url).open()
        page.wait_for_hydration()
        page.login(email, "definitely-not-the-password")

        # Așteptăm să apară mesajul (apelul la Supabase e asincron).
        page.find("auth-error")
        assert page.error_text()
        assert "/login" in driver.current_url

    def test_redirect_param_returns_to_the_requested_route(
        self, driver, base_url, credentials
    ):
        """Garda păstrează ruta cerută; după login ajungem exact acolo.

        E contractul dintre RequireAuth (pune ?redirect=) și AuthForm (îl
        citește) — ușor de rupt la o refactorizare, deci merită un test.
        """
        email, password = credentials
        page = BasePage(driver, base_url).open("/library")
        page.wait_for_path("/login")

        login = LoginPage(driver, base_url)
        login.wait_for_hydration()
        login.login(email, password)

        login.wait_for_path("/library")
        assert "/library" in driver.current_url


class TestSignOut:
    def test_sign_out_returns_to_login_and_clears_the_session(
        self, driver, base_url, credentials
    ):
        email, password = credentials
        login = LoginPage(driver, base_url).open()
        login.wait_for_hydration()
        login.login(email, password)
        login.wait_for_path("/library")

        library = LibraryPage(driver, base_url)
        library.sign_out()
        library.wait_for_path("/login")

        # Sesiunea e chiar dusă: /library ne trimite iar la login.
        again = BasePage(driver, base_url).open("/library")
        again.wait_for_path("/login")
        assert "/login" in driver.current_url


class TestSignedInLanding:
    def test_landing_offers_the_library_instead_of_signup(
        self, driver, base_url, credentials
    ):
        """Cu sesiune activă, butonul principal de pe `/` devine „open your library".

        Intenționat NU redirecționăm userul logat de pe landing — doar schimbăm
        butonul — ca pagina să nu clipească la fiecare vizită.
        """
        from pages import LandingPage

        email, password = credentials
        login = LoginPage(driver, base_url).open()
        login.wait_for_hydration()
        login.login(email, password)
        login.wait_for_path("/library")

        landing = LandingPage(driver, base_url).open()
        landing.wait_for_hydration()

        assert landing.primary_cta.get_attribute("href").endswith("/library")
        # „sign in" nu mai are rost pentru cineva deja logat.
        assert not landing.has("landing-cta-signin")
