"""LibraryPage — `/library`, raftul de cărți (rută protejată)."""

from __future__ import annotations

from .base_page import BasePage


class LibraryPage(BasePage):
    path = "/library"

    @property
    def title(self):
        return self.find("library-title")

    def sign_out(self) -> None:
        self.click("library-signout")

    def open_settings(self) -> None:
        self.click("library-settings")
