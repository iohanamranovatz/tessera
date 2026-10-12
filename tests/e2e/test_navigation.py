"""Navigare între rutele publice.

Testele astea nu au nevoie de Supabase funcțional: verifică doar că drumurile
dintre paginile publice chiar duc unde scrie pe ele, plus garda de rută.
"""

from __future__ import annotations

import pytest

from pages import LandingPage, LoginPage
from pages.base_page import BasePage


class TestFromLanding:
    def test_primary_cta_goes_to_signup(self, driver, base_url):
        page = LandingPage(driver, base_url).open()
        page.wait_for_hydration()
        page.wait_for_entrance()
        page.go_primary()
        page.wait_for_path("/signup")
        assert "/signup" in driver.current_url

    def test_signin_cta_goes_to_login(self, driver, base_url):
        page = LandingPage(driver, base_url).open()
        page.wait_for_hydration()
        page.wait_for_entrance()
        page.go_signin()
        page.wait_for_path("/login")
        assert "/login" in driver.current_url


class TestAuthPages:
    @pytest.mark.parametrize("path", ["/login", "/signup"])
    def test_auth_form_renders(self, driver, base_url, path):
        """Ambele moduri randează același <AuthForm />, cu toate câmpurile."""
        page = LoginPage(driver, base_url).open(path)
        assert page.form.is_displayed()
        assert page.find("auth-email").is_displayed()
        assert page.find("auth-password").is_displayed()
        assert page.submit.is_displayed()

    def test_login_and_signup_cross_link(self, driver, base_url):
        """Din login ajungi la signup prin link-ul de jos."""
        page = LoginPage(driver, base_url).open("/login")
        page.form  # așteptăm randarea
        page.driver.find_element("css selector", 'a[href="/signup"]').click()
        page.wait_for_path("/signup")
        assert "/signup" in driver.current_url


class TestLegalPages:
    @pytest.mark.parametrize(
        "path,expected",
        [("/privacy", "privacy"), ("/terms", "terms")],
    )
    def test_footer_pages_render(self, driver, base_url, path, expected):
        """Paginile legale trebuie să fie la un click de oriunde (GDPR)."""
        page = BasePage(driver, base_url).open(path)
        assert expected in driver.page_source.lower()

    def test_footer_links_to_privacy(self, driver, base_url):
        """Footer-ul din layout-ul rădăcină e prezent și pe landing."""
        LandingPage(driver, base_url).open().wait_for_hydration()
        link = driver.find_element("css selector", 'footer a[href="/privacy"]')
        assert link.get_attribute("href").endswith("/privacy")


class TestRouteGuard:
    def test_library_redirects_anonymous_user_to_login(self, driver, base_url):
        """`RequireAuth` trimite un vizitator nelogat la /login, cu ?redirect=.

        Nu are nevoie de Supabase funcțional: fără sesiune în localStorage,
        garda redirecționează oricum.
        """
        page = BasePage(driver, base_url).open("/library")
        page.wait_for_path("/login")
        # Ruta cerută se păstrează, ca după login să ne întoarcem acolo.
        assert "redirect" in driver.current_url

    def test_unknown_route_shows_not_found(self, driver, base_url):
        """O rută inexistentă dă pagina 404 a aplicației, nu o eroare brută.

        Verificăm textul REAL din app/not-found.tsx („Lost in the library"),
        nu un „Page Not Found" generic pe care aplicația nu-l folosește.
        """
        BasePage(driver, base_url).open("/this-route-does-not-exist")
        body = driver.find_element("tag name", "body").text.lower()
        assert "404" in body
        assert "lost in the library" in body
