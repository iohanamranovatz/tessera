"""Pagina de setări: navigare, sign out, validările formularelor, delete account.

Marcate `auth` — au nevoie de TESSERA_TEST_EMAIL / TESSERA_TEST_PASSWORD.

NU schimbăm efectiv parola sau emailul contului de test și NU îl ștergem: un
test care eșuează la jumătate ar lăsa contul inutilizabil pentru restul suitei.
Verificăm doar căile care se opresc înainte de orice scriere.
"""

from __future__ import annotations

import pytest

from pages import BoardPage, LibraryPage, LoginPage, SettingsPage

pytestmark = pytest.mark.auth


@pytest.fixture()
def logged_in(driver, base_url, credentials):
    email, password = credentials
    login = LoginPage(driver, base_url).open()
    login.wait_for_hydration()
    login.login(email, password)
    login.wait_for_path("/library")
    return email, password


@pytest.fixture()
def settings(driver, base_url, logged_in) -> SettingsPage:
    page = SettingsPage(driver, base_url).open()
    page.wait_for_hydration()
    page.find("settings-password-form")
    return page


class TestNavigation:
    def test_board_gear_opens_settings(self, driver, base_url, logged_in, seeded_book):
        board = BoardPage(driver, base_url).open_book(seeded_book)
        board.click("topbar-settings")
        board.wait_for_path("/settings")
        assert SettingsPage(driver, base_url).title.is_displayed()

    def test_library_gear_opens_settings(self, driver, base_url, logged_in):
        library = LibraryPage(driver, base_url)
        library.wait_for_hydration()
        library.open_settings()
        library.wait_for_path("/settings")

    def test_danger_actions_are_no_longer_in_the_library(self, driver, base_url, logged_in):
        library = LibraryPage(driver, base_url)
        library.title  # așteaptă randarea
        assert "Delete my account" not in driver.page_source
        assert "Delete all my data" not in driver.page_source

    def test_shows_the_current_email(self, settings: SettingsPage, logged_in):
        email, _ = logged_in
        assert settings.find("settings-current-email").text == email


class TestPassword:
    def test_wrong_current_password_is_rejected(self, settings: SettingsPage):
        settings.change_password("definitely-not-the-password", "new-password-123")
        assert "incorrect" in settings.find("settings-password-error").text.lower()

    def test_mismatched_new_passwords_are_rejected(self, settings: SettingsPage, logged_in):
        _, password = logged_in
        settings.change_password(password, "new-password-123", confirm="something-else")
        assert "match" in settings.find("settings-password-error").text.lower()


class TestEmail:
    def test_same_email_is_rejected(self, settings: SettingsPage, logged_in):
        email, _ = logged_in
        settings.change_email(email)
        assert settings.find("settings-email-error").is_displayed()


class TestSignOut:
    def test_sign_out_goes_to_login(self, settings: SettingsPage):
        settings.sign_out()
        settings.wait_for_path("/login")


class TestDeleteAccount:
    def test_dialog_opens_and_cancel_closes_it(self, settings: SettingsPage):
        settings.open_delete_dialog()
        settings.click("settings-delete-cancel")
        settings._wait().until(
            lambda d: not settings.has("settings-delete-dialog"),
            "The delete dialog never closed",
        )
        # Încă suntem logați și pe pagină.
        assert "/settings" in settings.current_path
