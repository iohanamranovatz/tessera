"""BoardPage — colajul unei cărți (`/book/<id>?tab=collage`).

Rută protejată: toate testele care o folosesc sunt marcate `auth`.
"""

from __future__ import annotations

from selenium.webdriver.common.by import By

from .base_page import BasePage


class BoardPage(BasePage):
    #: Board-ul n-are o cale fixă — depinde de carte. Folosește `open_book`.
    path = "/library"

    def open_book(self, book_id: str) -> "BoardPage":
        self.open(f"/book/{book_id}?tab=collage")
        self.wait_for_hydration()
        return self

    # -- fragmente ---------------------------------------------------------- #
    def fragments(self):
        """Toate cardurile de pe board, în ordinea din DOM."""
        return self.driver.find_elements(By.CSS_SELECTOR, '[data-testid="fragment"]')

    def fragment_count(self) -> int:
        return len(self.fragments())

    def fragment_by_id(self, fragment_id: str):
        return self.driver.find_element(
            By.CSS_SELECTOR, f'[data-fragment-id="{fragment_id}"]'
        )

    def position_of(self, element) -> tuple[float, float]:
        """Poziția stocată a cardului, citită din stilul inline (procente).

        Citim `style`, nu coordonatele de pe ecran: modelul ține procente, iar
        asta e valoarea care ajunge în baza de date.
        """
        style = element.get_attribute("style") or ""
        left = _percent(style, "left")
        top = _percent(style, "top")
        return left, top

    # -- acțiuni ------------------------------------------------------------ #
    def open_add_dialog(self) -> None:
        self.click("board-add")
        self.find("fragment-dialog")

    def select_fragment(self, element) -> None:
        """Click scurt pe un card — îl selectează și scoate bara de acțiuni."""
        element.click()
        self.find("fragment-edit")

    def drag_fragment(self, element, dx: int, dy: int) -> None:
        """Trage cardul cu (dx, dy) pixeli față de centrul lui.

        Folosim coordonate ABSOLUTE din viewport, nu `move_by_offset`: offset-ul
        relativ se acumulează și iese ușor din fereastră, iar Selenium aruncă
        atunci `MoveTargetOutOfBounds`. Ținta o limităm la viewport — o tragere
        „în afara ecranului" oricum nu există ca gest real.

        Mergem în pași mici fiindcă board-ul pornește tragerea abia după un prag
        de 4px: un singur salt ar produce prea puține evenimente `pointermove`.
        """
        from selenium.webdriver import ActionChains

        box = self.driver.execute_script(
            "const r = arguments[0].getBoundingClientRect();"
            "return {x: r.x + r.width / 2, y: r.y + r.height / 2,"
            " w: window.innerWidth, h: window.innerHeight};",
            element,
        )
        start_x, start_y = box["x"], box["y"]
        margin = 5
        target_x = max(margin, min(box["w"] - margin, start_x + dx))
        target_y = max(margin, min(box["h"] - margin, start_y + dy))

        actions = ActionChains(self.driver)
        pointer = actions.w3c_actions.pointer_action
        pointer.move_to_location(int(start_x), int(start_y))
        pointer.pointer_down()
        steps = 8
        for i in range(1, steps + 1):
            pointer.move_to_location(
                int(start_x + (target_x - start_x) * i / steps),
                int(start_y + (target_y - start_y) * i / steps),
            )
        pointer.pointer_up()
        actions.perform()

    def delete_selected(self) -> None:
        """Apasă coșul de gunoi și confirmă în dialog."""
        self.click("fragment-delete")
        self.click("confirm-delete-fragment")


def _percent(style: str, prop: str) -> float:
    """Scoate valoarea procentuală a unei proprietăți din atributul `style`."""
    for part in style.split(";"):
        name, _, value = part.partition(":")
        if name.strip() == prop and "%" in value:
            return float(value.strip().rstrip("%"))
    return -1.0
