"""Fixtures pentru suita Selenium.

Ce rezolvă fișierul ăsta:

* **Browser-ul** — un singur Chrome/Chromium headless pe toată sesiunea
  (pornirea lui e partea lentă), dar cu starea curățată între teste, ca un
  test logat să nu „scurgă" sesiunea în următorul.
* **Serverul de dev** — dacă nu răspunde nimic pe `base_url`, îl pornim noi cu
  `npm run dev` și îl oprim la final. Dacă userul are deja `npm run dev` pornit,
  ne atașăm la el și nu ne atingem de el.
* **Credențialele** — testele marcate `auth` se SARĂ curat când nu există
  cont de test, ca suita să fie verde și fără Supabase configurat.

Variabile de mediu:
    TESSERA_BASE_URL        implicit http://localhost:3000
    TESSERA_TEST_EMAIL      contul folosit de testele @auth
    TESSERA_TEST_PASSWORD   parola lui
"""

from __future__ import annotations

import os
import shutil
import socket
import subprocess
import time
import urllib.error
import urllib.request
from pathlib import Path

import pytest
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service

#: Rădăcina proiectului Next.js (tests/e2e/ -> tests/ -> repo).
PROJECT_ROOT = Path(__file__).resolve().parents[2]

#: Cât așteptăm ca serverul de dev să răspundă după ce îl pornim. Primul
#: `next dev` compilează rutele la cerere, deci poate dura.
SERVER_BOOT_TIMEOUT_S = 180


# --------------------------------------------------------------------------- #
# Opțiuni CLI
# --------------------------------------------------------------------------- #
def pytest_addoption(parser: pytest.Parser) -> None:
    parser.addoption(
        "--headed",
        action="store_true",
        default=False,
        help="Show the browser window instead of running headless (for debugging).",
    )
    parser.addoption(
        "--slowmo",
        action="store",
        type=float,
        default=0.0,
        help="Seconds to pause after each page load — makes a --headed run watchable.",
    )


# --------------------------------------------------------------------------- #
# URL de bază + serverul de dev
# --------------------------------------------------------------------------- #
@pytest.fixture(scope="session")
def base_url() -> str:
    """URL-ul aplicației testate, fără slash la final."""
    return os.environ.get("TESSERA_BASE_URL", "http://localhost:3000").rstrip("/")


def _responds(url: str, timeout: float = 2.0) -> bool:
    """True dacă ceva răspunde HTTP la `url` (orice status, inclusiv 500).

    Un 500 tot înseamnă „serverul e sus" — exact ce vrem să știm aici.
    """
    try:
        urllib.request.urlopen(url, timeout=timeout)
        return True
    except urllib.error.HTTPError:
        return True  # a răspuns, doar că cu eroare
    except (urllib.error.URLError, socket.timeout, ConnectionError):
        return False


@pytest.fixture(scope="session", autouse=True)
def dev_server(base_url: str):
    """Asigură un server pe `base_url`. Pornește unul doar dacă e nevoie."""
    if _responds(base_url):
        # Deja pornit (de user, sau de o rulare anterioară) — nu-l atingem.
        yield base_url
        return

    npm = shutil.which("npm")
    if npm is None:
        pytest.skip(f"Nothing is listening on {base_url} and npm is not on PATH.")

    port = base_url.rsplit(":", 1)[-1]
    process = subprocess.Popen(
        [npm, "run", "dev", "--", "--port", port],
        cwd=PROJECT_ROOT,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        # Grup de procese propriu: `next dev` își face copii, iar fără asta
        # la teardown am omorî doar wrapper-ul npm și am lăsa serverul agățat.
        start_new_session=True,
    )

    deadline = time.monotonic() + SERVER_BOOT_TIMEOUT_S
    while time.monotonic() < deadline:
        if process.poll() is not None:
            output = process.stdout.read() if process.stdout else ""
            pytest.fail(f"`npm run dev` exited early:\n{output[-3000:]}")
        if _responds(base_url):
            break
        time.sleep(1.0)
    else:
        _terminate(process)
        pytest.fail(f"Dev server did not answer on {base_url} within {SERVER_BOOT_TIMEOUT_S}s.")

    yield base_url
    _terminate(process)


def _terminate(process: subprocess.Popen) -> None:
    """Oprește grupul de procese al serverului, cu escaladare la SIGKILL."""
    if process.poll() is not None:
        return
    try:
        os.killpg(os.getpgid(process.pid), 15)  # SIGTERM pe tot grupul
        process.wait(timeout=10)
    except (ProcessLookupError, PermissionError):
        pass
    except subprocess.TimeoutExpired:
        try:
            os.killpg(os.getpgid(process.pid), 9)  # SIGKILL
        except (ProcessLookupError, PermissionError):
            pass


# --------------------------------------------------------------------------- #
# Browser
# --------------------------------------------------------------------------- #
def _find_binary(*candidates: str) -> str | None:
    for name in candidates:
        found = shutil.which(name)
        if found:
            return found
    return None


def _is_snap(binary: str) -> bool:
    """True dacă binarul e Chromium împachetat ca snap.

    Pe Ubuntu, `chromium` e de regulă un snap, iar `/usr/bin/chromium-browser`
    e doar un wrapper peste el — de aceea ne uităm și la conținutul fișierului,
    nu doar la calea lui.
    """
    resolved = os.path.realpath(binary)
    # `/snap/bin/chromium` e un symlink către `/usr/bin/snap` (lansatorul),
    # deci realpath-ul NU e sub /snap/ — verificăm ambele capete ale legăturii
    # și numele lansatorului.
    if binary.startswith("/snap/") or resolved.startswith("/snap/"):
        return True
    if os.path.basename(resolved) == "snap":
        return True
    try:
        with open(resolved, "rb") as handle:
            head = handle.read(2048)
        return head.startswith(b"#!") and b"snap" in head
    except OSError:
        return False


def _snap_profile_dir() -> str | None:
    """Un director de profil pe care Chromium-snap CHIAR are voie să-l scrie.

    Miezul problemei: chromedriver dă mereu browser-ului un `--user-data-dir`
    sub /tmp. Un Chromium snap e însă confinat și NU poate scrie acolo (nici în
    ~/.cache) — pornește și moare imediat, iar Selenium raportează doar
    „Chrome instance exited", fără să spună de ce.

    Soluția: îi dăm explicit un profil sub ~/snap/chromium/common/, singura
    zonă din afara profilului implicit în care snap-ul are drept de scriere.
    Întoarce None dacă directorul nu există (atunci nu e un snap uzual și
    lăsăm chromedriver să-și aleagă singur profilul).
    """
    base = Path.home() / "snap" / "chromium" / "common"
    if not base.is_dir():
        return None
    profile = base / f"selenium-profile-{os.getpid()}"
    profile.mkdir(parents=True, exist_ok=True)
    return str(profile)


@pytest.fixture(scope="session")
def _browser(request: pytest.FixtureRequest):
    """Un singur browser pe sesiune — pornirea lui e cea mai scumpă parte."""
    options = Options()
    if not request.config.getoption("--headed"):
        options.add_argument("--headless=new")

    # Pe Linux fără Chrome „de sistem", Selenium nu ghicește întotdeauna
    # binarul. Îl indicăm explicit când îl găsim.
    binary = _find_binary("chromium", "chromium-browser", "google-chrome", "chrome")
    snap = bool(binary) and _is_snap(binary)
    profile_dir: str | None = None

    # CAZUL SNAP (Ubuntu, implicit). Un chromedriver „de sistem" NU poate porni
    # un Chromium snap: lansarea eșuează cu „failed to execvp" înăuntrul
    # confinării, iar Selenium raportează doar „Chrome instance exited".
    # Snap-ul își aduce însă PROPRIUL driver, care rulează în aceeași confinare
    # și pornește browser-ul corect — pe acela îl preferăm.
    snap_driver = _find_binary("chromium.chromedriver") if snap else None

    if binary and not snap_driver:
        # Cu driverul snap NU setăm binary_location: știe singur unde e
        # browser-ul lui, iar o cale din afara confinării l-ar încurca.
        options.binary_location = binary

    if snap:
        # Chromium-snap nu poate scrie profilul pe care chromedriver i-l dă
        # implicit (sub /tmp) — îi dăm unul în zona lui permisă.
        profile_dir = _snap_profile_dir()
        if profile_dir:
            options.add_argument(f"--user-data-dir={profile_dir}")

    # --no-sandbox: necesar în containere/CI, unde user namespaces lipsesc.
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--disable-gpu")
    options.add_argument("--window-size=1440,900")
    # Fără asta, extensiile/antrenamentele implicite pot schimba randarea.
    options.add_argument("--disable-extensions")

    driver_path = snap_driver or shutil.which("chromedriver")
    service = Service(executable_path=driver_path) if driver_path else Service()

    try:
        driver = webdriver.Chrome(service=service, options=options)
    except Exception as exc:  # pragma: no cover - mediu fără browser
        pytest.skip(
            f"Could not start Chrome/Chromium for Selenium: {exc}\n"
            f"binary={binary!r} snap={snap} driver={driver_path!r} profile={profile_dir!r}"
        )

    driver.set_page_load_timeout(60)
    yield driver

    try:
        driver.quit()
    except PermissionError:
        # Snap re-parentează procesul browser-ului, deci Selenium nu are voie
        # să-i trimită semnalul de oprire. Sesiunea E închisă oricum; fără
        # asta, fiecare rulare s-ar încheia cu un traceback inutil.
        pass

    # Profilul temporar al snap-ului: îl ștergem, altfel ~/snap/chromium/common
    # se umple cu câte un director per rulare.
    if profile_dir:
        shutil.rmtree(profile_dir, ignore_errors=True)


@pytest.fixture()
def driver(_browser: webdriver.Chrome, base_url: str, request: pytest.FixtureRequest):
    """Browser-ul de sesiune, cu starea resetată înainte de fiecare test.

    Supabase ține sesiunea în `localStorage`, deci curățăm și cookie-urile ȘI
    storage-ul — altfel un test de login ar lăsa următorul test logat.
    """
    _browser.delete_all_cookies()
    try:
        # Storage-ul e per-origine: trebuie să FIM pe origine ca să-l ștergem.
        _browser.get(f"{base_url}/")
        _browser.execute_script(
            "try { localStorage.clear(); sessionStorage.clear(); } catch (e) {}"
        )
        _browser.delete_all_cookies()
    except Exception:
        # Dacă pagina nu încarcă, lăsăm testul să raporteze el problema —
        # un eșec de curățenie nu e informația utilă.
        pass

    _browser._tessera_slowmo = request.config.getoption("--slowmo")  # type: ignore[attr-defined]
    return _browser


# --------------------------------------------------------------------------- #
# Credențiale pentru testele @auth
# --------------------------------------------------------------------------- #
@pytest.fixture(scope="session")
def credentials() -> tuple[str, str]:
    """Contul de test, sau SKIP curat dacă nu e configurat."""
    email = os.environ.get("TESSERA_TEST_EMAIL")
    password = os.environ.get("TESSERA_TEST_PASSWORD")
    if not email or not password:
        pytest.skip(
            "Set TESSERA_TEST_EMAIL and TESSERA_TEST_PASSWORD (and real Supabase "
            "keys in .env.local) to run the authenticated tests."
        )
    return email, password


# --------------------------------------------------------------------------- #
# Date de test în Supabase (pentru testele de board)
# --------------------------------------------------------------------------- #
#
# Testele de board au nevoie de o carte cu personaje și fragmente. Să depindem
# de ce se întâmplă să fie în contul cuiva e fragil: pe un cont gol se sar toate,
# iar pe unul plin ar modifica munca reală a utilizatorului. Așa că ne creăm
# singuri o carte dedicată și o ștergem la final (ștergerea cărții cascadează
# peste personaje, relații și fragmente, prin cheile străine din schemă).
#
# Lucrăm direct prin API-ul REST, nu prin interfață: pregătirea datelor nu e
# ceea ce testăm, iar prin onboarding ar însemna un apel la Gemini și ~30s.

import json
import urllib.parse


def _supabase_config() -> tuple[str, str]:
    """Citește URL-ul și cheia anon din .env.local al proiectului."""
    env = PROJECT_ROOT / ".env.local"
    if not env.is_file():
        pytest.skip("No .env.local — cannot reach Supabase to seed test data.")
    values = {}
    for line in env.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            key, _, value = line.partition("=")
            values[key.strip()] = value.strip().strip('"').strip("'")
    url = values.get("NEXT_PUBLIC_SUPABASE_URL", "").rstrip("/")
    key = values.get("NEXT_PUBLIC_SUPABASE_ANON_KEY", "")
    if not url or not key:
        pytest.skip("Supabase keys missing from .env.local.")
    return url, key


def _api(url: str, key: str, path: str, token: str, method="GET", body=None):
    """Un apel la PostgREST/GoTrue, autentificat ca utilizatorul de test."""
    data = json.dumps(body).encode() if body is not None else None
    request = urllib.request.Request(
        f"{url}{path}",
        data=data,
        method=method,
        headers={
            "apikey": key,
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            # Ca inserturile să ne întoarcă rândurile create.
            "Prefer": "return=representation",
        },
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        raw = response.read()
        return json.loads(raw) if raw else None


@pytest.fixture(scope="session")
def _supabase_session(credentials) -> tuple[str, str, str]:
    """(url, cheie anon, token de acces) — o singură autentificare pe rulare."""
    url, key = _supabase_config()
    email, password = credentials
    try:
        auth = _api(
            url, key, "/auth/v1/token?grant_type=password", key,
            method="POST", body={"email": email, "password": password},
        )
    except urllib.error.HTTPError as exc:
        pytest.skip(f"Could not sign in to seed test data: {exc.read()[:200]!r}")
    return url, key, auth["access_token"]


@pytest.fixture()
def seeded_book(_supabase_session) -> str:
    """O carte de test PROASPĂTĂ pentru fiecare test, ștearsă la final.

    De ce per-test și nu per-sesiune: testele adaugă și mută fragmente. Pe o
    carte comună, board-ul se aglomera de la un test la altul până când cardurile
    ajungeau să se suprapună, iar un click nimerea alt card decât cel vizat —
    adică eșecuri care depind de ordinea testelor, nu de cod. Costul izolării e
    de câteva apeluri REST; merită.
    """
    import uuid

    url, key, token = _supabase_session

    # 2. Cartea. `user_id` se completează singur din sesiune (default auth.uid()).
    book_id = str(uuid.uuid4())
    _api(url, key, "/rest/v1/books", token, method="POST", body={
        "id": book_id,
        "title": "Selenium Test Book",
        "author": "Automated Suite",
        "year": 1880,
        "language": "English",
        "total_chapters": 10,
        "current_chapter": 5,
        "cover_color": "#8a3020",
    })

    # 3. Două personaje, ca selectorul din dialog să aibă ce arăta.
    characters = []
    for name, color in (("Test Alpha", "#8a3020"), ("Test Beta", "#2a4a5a")):
        character_id = str(uuid.uuid4())
        characters.append(character_id)
        _api(url, key, "/rest/v1/characters", token, method="POST", body={
            "id": character_id, "book_id": book_id, "name": name,
            "nicknames": [], "description": "Seeded for the Selenium suite.",
            "tags": [], "color": color, "status": "alive", "appears_in_chapter": 1,
        })

    # 4. Trei fragmente de text, în poziții distincte — testele de tragere,
    #    editare și ștergere au nevoie de ceva pe board.
    for index, (x, y) in enumerate(((30, 30), (60, 40), (45, 65))):
        _api(url, key, "/rest/v1/fragments", token, method="POST", body={
            "id": str(uuid.uuid4()), "book_id": book_id,
            "character_id": characters[index % len(characters)],
            "type": "quote", "content": f"seeded fragment {index + 1}",
            "label": f"seed {index + 1}",
            "position": {"x": x, "y": y, "rotation": 0}, "size": "medium",
        })

    yield book_id

    # 5. Curățenie. Cartea întâi (restul cade prin cascadă), apoi FIȘIERELE
    #    încărcate de testele de upload: cascada bazei de date nu atinge
    #    Storage-ul, deci fără pasul ăsta fiecare rulare ar lăsa poze orfane.
    try:
        paths = []
        for row in _api(
            url, key,
            f"/rest/v1/fragments?book_id=eq.{urllib.parse.quote(book_id)}&select=image_meta",
            token,
        ) or []:
            meta = row.get("image_meta") or {}
            paths += [p for p in (meta.get("storagePath"), meta.get("thumbStoragePath")) if p]

        _api(url, key, f"/rest/v1/books?id=eq.{urllib.parse.quote(book_id)}",
             token, method="DELETE")

        if paths:
            _api(url, key, "/storage/v1/object/fragment-images", token,
                 method="DELETE", body={"prefixes": paths})
    except Exception as exc:  # pragma: no cover
        print(f"Warning: could not clean up the seeded book {book_id}: {exc}")
