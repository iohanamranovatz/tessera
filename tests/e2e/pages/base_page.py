"""BasePage — helperii comuni de așteptare.

Regula suitei: NU folosim `time.sleep`. Next.js hidratează asincron, iar
landing-ul are animații de ~2s, deci orice pauză fixă e sau prea scurtă (test
instabil) sau prea lungă (suită lentă). Așteptăm condiții, nu secunde.

Selectorii sunt `data-testid`, nu clase de Tailwind: clasele se schimbă la
fiecare retușare de design, testid-urile sunt un contract explicit.
"""

from __future__ import annotations

from selenium.webdriver.common.by import By
from selenium.webdriver.remote.webdriver import WebDriver
from selenium.webdriver.remote.webelement import WebElement
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

#: Cât așteptăm implicit o condiție. Generos, fiindcă `next dev` compilează
#: fiecare rută la prima cerere.
DEFAULT_TIMEOUT = 30


class BasePage:
    """Rădăcina page-object-urilor: navigare + așteptări."""

    #: Calea rutei, suprascrisă de fiecare subclasă (ex: "/login").
    path: str = "/"

    def __init__(self, driver: WebDriver, base_url: str) -> None:
        self.driver = driver
        self.base_url = base_url.rstrip("/")

    # -- navigare ----------------------------------------------------------- #
    def open(self, path: str | None = None) -> "BasePage":
        """Încarcă ruta paginii (sau `path`, dacă e dat) și se întoarce pe sine."""
        self.driver.get(f"{self.base_url}{path if path is not None else self.path}")
        return self

    @property
    def current_path(self) -> str:
        """Partea de după origine din URL-ul curent (cu query string)."""
        return self.driver.current_url[len(self.base_url) :] or "/"

    # -- așteptări ---------------------------------------------------------- #
    def _wait(self, timeout: int | None = None) -> WebDriverWait:
        return WebDriverWait(self.driver, timeout or DEFAULT_TIMEOUT)

    def find(self, testid: str, timeout: int | None = None) -> WebElement:
        """Elementul cu `data-testid=<testid>`, odată ce e VIZIBIL.

        Vizibil, nu doar prezent: landing-ul își animă conținutul, iar un
        element prezent dar încă transparent nu e ceva ce userul poate folosi.
        """
        return self._wait(timeout).until(
            EC.visibility_of_element_located((By.CSS_SELECTOR, f'[data-testid="{testid}"]')),
            f'No visible element with data-testid="{testid}"',
        )

    def click(self, testid: str, timeout: int | None = None) -> None:
        """Așteaptă să fie clicabil, apoi dă click."""
        element = self._wait(timeout).until(
            EC.element_to_be_clickable((By.CSS_SELECTOR, f'[data-testid="{testid}"]')),
            f'Element data-testid="{testid}" never became clickable',
        )
        element.click()

    def fill(self, testid: str, value: str) -> None:
        """Golește câmpul și scrie `value` în el."""
        field = self.find(testid)
        field.clear()
        field.send_keys(value)

    def has(self, testid: str) -> bool:
        """True dacă elementul există în DOM ACUM (fără așteptare).

        Pentru „elementul ăsta NU trebuie să fie aici" — unde o așteptare ar
        însemna doar să pierdem timeout-ul degeaba.
        """
        return bool(
            self.driver.find_elements(By.CSS_SELECTOR, f'[data-testid="{testid}"]')
        )

    def wait_for_path(self, fragment: str, timeout: int | None = None) -> None:
        """Așteaptă până când URL-ul conține `fragment` (ex: "/login")."""
        self._wait(timeout).until(
            EC.url_contains(fragment),
            f'URL never contained "{fragment}" (last was {self.driver.current_url})',
        )

    def wait_for_hydration(self, timeout: int | None = None) -> None:
        """Așteaptă ca React să fi hidratat pagina.

        Până la hidratare, butoanele sunt în DOM dar handler-ele nu sunt legate,
        deci un click „reușește" fără să facă nimic — sursa clasică de teste
        instabile pe Next.js. Semnalul: Next pune `__next_f` pe window și
        documentul e `complete`.
        """
        self._wait(timeout).until(
            lambda d: d.execute_script(
                "return document.readyState === 'complete' && !!window.__next_f"
            ),
            "Page never finished hydrating",
        )
