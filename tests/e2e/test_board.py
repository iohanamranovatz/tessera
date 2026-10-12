"""CRUD-ul fragmentelor de pe board.

TOATE testele de aici au nevoie de un cont real (board-ul e rută protejată) ȘI
de o carte existentă în biblioteca acelui cont. Fără ele se sar curat.

    export TESSERA_TEST_EMAIL=you@example.com
    export TESSERA_TEST_PASSWORD=...
    pytest tests/e2e/test_board.py

Pentru încărcarea de imagini mai trebuie rulată o dată
`supabase/migrations/005_fragment_images.sql` în SQL Editor-ul Supabase —
altfel upload-ul eșuează cu „Image storage isn't set up yet".
"""

from __future__ import annotations

from pathlib import Path

import pytest
from selenium.webdriver.common.by import By

from pages import BoardPage, LoginPage

pytestmark = pytest.mark.auth

#: Fișierele pe care le încărcăm în testele de upload.
IMAGE_FIXTURE = Path(__file__).parent / "fixtures" / "test-image.png"
TEXT_FIXTURE = Path(__file__).parent / "fixtures" / "not-an-image.txt"


@pytest.fixture()
def board(driver, base_url, credentials, seeded_book) -> BoardPage:
    """Loghează-te și deschide board-ul cărții create de `seeded_book`.

    Mergem direct pe URL-ul cărții, nu prin bibliotecă: cartea de test e a
    noastră, o știm după id, iar un click pe „primul card din raft" ar depinde
    de ce mai are contul în el.
    """
    email, password = credentials
    login = LoginPage(driver, base_url).open()
    login.wait_for_hydration()
    login.login(email, password)
    login.wait_for_path("/library")

    page = BoardPage(driver, base_url).open_book(seeded_book)
    # Fragmentele vin din Supabase după hidratare — așteptăm să apară.
    page._wait().until(
        lambda d: page.fragment_count() > 0,
        "The seeded fragments never rendered on the board",
    )
    return page


class TestCreate:
    def test_add_button_opens_the_dialog(self, board: BoardPage):
        board.open_add_dialog()
        assert board.find("fragment-dialog").is_displayed()

    def test_dialog_asks_image_or_text_first(self, board: BoardPage):
        """Prima alegere e „imagine sau text", nu un tip de fragment obscur.

        Asta e reparația de fond: înainte puteai scrie un cuvânt și primeai un
        card cu cuvântul desenat uriaș, fără să fi vrut asta vreodată.
        """
        board.open_add_dialog()
        assert board.find("fragment-kind-image").is_displayed()
        assert board.find("fragment-kind-text").is_displayed()
        # Implicit e „imagine" — cazul pe care userul nu-l avea deloc înainte.
        assert board.find("fragment-kind-image").get_attribute("aria-pressed") == "true"

    def test_image_mode_offers_a_dropzone(self, board: BoardPage):
        board.open_add_dialog()
        board.click("fragment-kind-image")
        assert board.find("fragment-dropzone").is_displayed()

    def test_text_mode_swaps_to_the_text_fields(self, board: BoardPage):
        board.open_add_dialog()
        board.click("fragment-kind-text")
        assert board.find("fragment-type").is_displayed()
        assert board.find("fragment-content").is_displayed()
        # În modul text nu mai există zonă de încărcare.
        assert not board.has("fragment-dropzone")

    def test_text_fragment_is_created(self, board: BoardPage):
        before = board.fragment_count()
        board.open_add_dialog()
        board.click("fragment-kind-text")
        board.fill("fragment-content", "a test fragment")
        board.fill("fragment-label", "test caption")
        board.click("fragment-save")

        board._wait().until(
            lambda d: board.fragment_count() == before + 1,
            "The new fragment never appeared on the board",
        )

    def test_empty_content_is_rejected(self, board: BoardPage):
        """Salvarea fără conținut dă o eroare, nu un card gol."""
        board.open_add_dialog()
        board.click("fragment-kind-text")
        board.click("fragment-save")
        assert board.find("fragment-error").text.strip()


class TestImageUpload:
    """Calea care lipsea cu totul: utilizatorul își pune propria imagine.

    Are nevoie ȘI de migrația `005_fragment_images.sql` rulată în Supabase —
    fără ea upload-ul dă „Image storage isn't set up yet".
    """

    def test_uploading_an_image_creates_an_image_fragment(self, board: BoardPage):
        before = board.fragment_count()

        board.open_add_dialog()
        board.click("fragment-kind-image")
        # Trimitem calea direct în `<input type=file>`. E ascuns (zona vizibilă
        # e un div stilizat), dar input-urile de fișier acceptă send_keys oricum.
        board.driver.find_element(
            "css selector", '[data-testid="fragment-file-input"]'
        ).send_keys(str(IMAGE_FIXTURE))

        # Upload-ul urcă două variante (mare + thumbnail), deci durează puțin.
        board._wait().until(
            lambda d: board.has("fragment-save")
            and "uploading" not in board.find("fragment-dropzone").text.lower(),
            "The upload never finished",
        )
        assert not board.has("fragment-error"), board.find("fragment-error").text

        board.click("fragment-save")
        board._wait().until(
            lambda d: board.fragment_count() == before + 1,
            "The uploaded fragment never appeared on the board",
        )

        # Cardul trebuie să poarte o IMAGINE, nu un cuvânt desenat — exact
        # diferența față de cum se comporta înainte.
        images = board.driver.find_elements(
            "css selector", '[data-testid="fragment"] img'
        )
        assert images, "No <img> on the board after uploading a picture"

    def test_upload_persists_across_a_reload(self, board: BoardPage):
        """Imaginea chiar e în Storage, nu doar în memoria paginii."""
        board.open_add_dialog()
        board.click("fragment-kind-image")
        board.driver.find_element(
            "css selector", '[data-testid="fragment-file-input"]'
        ).send_keys(str(IMAGE_FIXTURE))
        board._wait().until(
            lambda d: "uploading" not in board.find("fragment-dropzone").text.lower(),
            "The upload never finished",
        )
        board.click("fragment-save")
        board._wait().until(
            lambda d: board.driver.find_elements(
                "css selector", '[data-testid="fragment"] img'
            ),
            "Image never rendered",
        )

        board.driver.refresh()
        board.wait_for_hydration()
        board._wait().until(
            lambda d: board.fragment_count() > 0, "Board never re-rendered"
        )
        sources = [
            img.get_attribute("src")
            for img in board.driver.find_elements(
                "css selector", '[data-testid="fragment"] img'
            )
        ]
        assert any("fragment-images" in (src or "") for src in sources), (
            f"No image served from the uploads bucket after reload: {sources}"
        )

    def test_a_non_image_file_is_rejected(self, board: BoardPage):
        """Un fișier care nu e imagine e oprit ÎNAINTE de upload, cu mesaj clar."""
        board.open_add_dialog()
        board.click("fragment-kind-image")
        board.driver.find_element(
            "css selector", '[data-testid="fragment-file-input"]'
        ).send_keys(str(TEXT_FIXTURE))

        board.find("fragment-error")
        assert "image" in board.find("fragment-error").text.lower()


class TestSelectAndEdit:
    def test_click_selects_and_shows_the_toolbar(self, board: BoardPage):
        fragments = board.fragments()
        if not fragments:
            pytest.skip("Board has no fragments to select.")
        board.select_fragment(fragments[0])
        assert board.find("fragment-edit").is_displayed()
        assert board.find("fragment-delete").is_displayed()

    def test_escape_deselects(self, board: BoardPage):
        from selenium.webdriver.common.keys import Keys

        fragments = board.fragments()
        if not fragments:
            pytest.skip("Board has no fragments to select.")
        board.select_fragment(fragments[0])
        board.driver.find_element(By.TAG_NAME, "body").send_keys(Keys.ESCAPE)
        board._wait().until(
            lambda d: not board.has("fragment-edit"),
            "The toolbar stayed visible after Escape",
        )

    def test_edit_opens_prefilled(self, board: BoardPage):
        """Dialogul de editare se deschide cu valorile fragmentului, nu goale."""
        fragments = board.fragments()
        if not fragments:
            pytest.skip("Board has no fragments to edit.")
        board.select_fragment(fragments[0])
        board.click("fragment-edit")

        dialog = board.find("fragment-dialog")
        assert dialog.is_displayed()
        # Personajul e mereu precompletat — un fragment aparține cuiva.
        assert board.find("fragment-character").get_attribute("value")

    def test_caption_change_persists(self, board: BoardPage):
        """Eticheta editată chiar ajunge în baza de date.

        NU o căutăm în pagina randată: `FragmentContent` afișează eticheta doar
        pentru fragmentele de tip `place`/`object`, nu și pentru `quote`. Deci
        reîncărcăm pagina și redeschidem dialogul — dacă valoarea e acolo, a
        venit din DB, ceea ce e exact ce vrem să dovedim.
        """
        fragments = board.fragments()
        if not fragments:
            pytest.skip("Board has no fragments to edit.")

        fragment_id = fragments[0].get_attribute("data-fragment-id")
        board.select_fragment(fragments[0])
        board.click("fragment-edit")
        board.fill("fragment-label", "edited caption")
        board.click("fragment-save")

        board.driver.refresh()
        board.wait_for_hydration()
        board._wait().until(
            lambda d: board.fragment_count() > 0, "Board never re-rendered"
        )
        board.select_fragment(board.fragment_by_id(fragment_id))
        board.click("fragment-edit")
        assert board.find("fragment-label").get_attribute("value") == "edited caption"


class TestDrag:
    def test_dragging_moves_and_persists(self, board: BoardPage):
        """Tragerea schimbă poziția ȘI o salvează.

        Verificăm după un refresh: altfel am testa doar starea locală a
        board-ului, nu faptul că s-a scris în baza de date.
        """
        fragments = board.fragments()
        if not fragments:
            pytest.skip("Board has no fragments to drag.")

        target = fragments[0]
        fragment_id = target.get_attribute("data-fragment-id")
        before_x, before_y = board.position_of(target)

        board.drag_fragment(target, dx=120, dy=90)

        board.driver.refresh()
        board.wait_for_hydration()
        # Hidratarea nu înseamnă că datele au venit: fragmentele sosesc din
        # Supabase după aceea. Fără asta căutăm cardul într-un board încă gol.
        board._wait().until(
            lambda d: board.fragment_count() > 0, "Board never re-rendered"
        )
        after_x, after_y = board.position_of(board.fragment_by_id(fragment_id))

        assert (after_x, after_y) != (before_x, before_y), "Position did not change"

    def test_image_fragment_can_be_dragged(self, board: BoardPage):
        """Un card cu IMAGINE se trage la fel ca unul cu text.

        Regresie: `<img>` e draggable nativ, iar drag-ul HTML5 al browserului
        fura pointerul (`pointercancel`) — cardurile cu imagine nu se mișcau.
        """
        board.open_add_dialog()
        board.click("fragment-kind-image")
        board.driver.find_element(
            "css selector", '[data-testid="fragment-file-input"]'
        ).send_keys(str(IMAGE_FIXTURE))
        board._wait().until(
            lambda d: "uploading" not in board.find("fragment-dropzone").text.lower(),
            "The upload never finished",
        )
        board.click("fragment-save")
        board._wait().until(
            lambda d: board.driver.find_elements(
                By.CSS_SELECTOR, '[data-testid="fragment"] img'
            ),
            "Image never rendered",
        )

        image = board.driver.find_element(By.CSS_SELECTOR, '[data-testid="fragment"] img')
        target = image.find_element(By.XPATH, './ancestor::*[@data-testid="fragment"]')
        fragment_id = target.get_attribute("data-fragment-id")
        before = board.position_of(target)

        board.drag_fragment(target, dx=-120, dy=80)

        board.driver.refresh()
        board.wait_for_hydration()
        board._wait().until(
            lambda d: board.fragment_count() > 0, "Board never re-rendered"
        )
        after = board.position_of(board.fragment_by_id(fragment_id))
        assert after != before, "Image fragment did not move"

    def test_fragment_stays_on_screen(self, board: BoardPage):
        """O tragere violentă spre margine nu poate arunca un card în afara ecranului."""
        fragments = board.fragments()
        if not fragments:
            pytest.skip("Board has no fragments to drag.")

        target = fragments[0]
        fragment_id = target.get_attribute("data-fragment-id")
        board.drag_fragment(target, dx=-2000, dy=-2000)  # limitat la viewport

        x, y = board.position_of(board.fragment_by_id(fragment_id))
        # Board-ul limitează la 2–98%.
        assert 0 <= x <= 100 and 0 <= y <= 100


class TestDelete:
    def test_delete_asks_for_confirmation(self, board: BoardPage):
        fragments = board.fragments()
        if not fragments:
            pytest.skip("Board has no fragments to delete.")
        board.select_fragment(fragments[0])
        board.click("fragment-delete")
        # Dialogul trebuie să apară ÎNAINTE ca ceva să dispară.
        assert board.find("confirm-delete-fragment").is_displayed()
        assert board.fragment_count() == len(fragments)

    def test_confirming_removes_the_fragment(self, board: BoardPage):
        fragments = board.fragments()
        if not fragments:
            pytest.skip("Board has no fragments to delete.")
        before = len(fragments)

        board.select_fragment(fragments[0])
        board.delete_selected()

        board._wait().until(
            lambda d: board.fragment_count() == before - 1,
            "The fragment was still on the board after confirming",
        )
