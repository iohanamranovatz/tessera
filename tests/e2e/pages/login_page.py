"""LoginPage — `/login` și `/signup` (același <AuthForm />, moduri diferite)."""

from __future__ import annotations

from .base_page import BasePage


class LoginPage(BasePage):
    path = "/login"

    @property
    def form(self):
        return self.find("auth-form")

    @property
    def submit(self):
        return self.find("auth-submit")

    def error_text(self) -> str | None:
        """Mesajul de eroare afișat, sau None dacă nu e niciunul."""
        if not self.has("auth-error"):
            return None
        return self.find("auth-error").text.strip()

    def login(self, email: str, password: str) -> None:
        """Completează și trimite formularul.

        Nu așteaptă rezultatul — apelantul decide dacă se uită după redirect
        (succes) sau după mesaj de eroare (eșec).
        """
        self.fill("auth-email", email)
        self.fill("auth-password", password)
        self.click("auth-submit")
