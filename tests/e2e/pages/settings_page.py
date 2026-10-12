"""SettingsPage — `/settings`, setările contului (rută protejată)."""

from __future__ import annotations

from .base_page import BasePage


class SettingsPage(BasePage):
    path = "/settings"

    @property
    def title(self):
        return self.find("settings-title")

    def change_password(self, current: str, new: str, confirm: str | None = None) -> None:
        self.fill("settings-current-password", current)
        self.fill("settings-new-password", new)
        self.fill("settings-confirm-password", new if confirm is None else confirm)
        self.click("settings-password-submit")

    def change_email(self, email: str) -> None:
        self.fill("settings-new-email", email)
        self.click("settings-email-submit")

    def sign_out(self) -> None:
        self.click("settings-signout")

    def open_delete_dialog(self) -> None:
        self.click("settings-delete-account")
        self.find("settings-delete-dialog")
