# Tessera — Selenium end-to-end tests

Python + pytest + Selenium, driving headless Chromium against a running Tessera
dev server.

## Setup

```bash
pip install -r tests/e2e/requirements.txt
```

You also need a Chrome/Chromium binary and a matching `chromedriver` on `PATH`.
On Debian/Ubuntu:

```bash
sudo apt install chromium-browser chromium-driver
```

If either is missing, the suite **skips** rather than failing — the browser
fixture reports why.

## Running

```bash
pytest tests/e2e
```

The suite starts `npm run dev` itself if nothing is listening on the base URL,
waits for it, and shuts it down afterwards. If you already have a dev server
running it attaches to that one and leaves it alone.

| Command | What it does |
|---|---|
| `pytest tests/e2e` | Everything; `auth` tests skip unless credentials are set |
| `pytest tests/e2e -m "not auth"` | Only the tests that need no Supabase account |
| `pytest tests/e2e --headed` | Show the browser window |
| `pytest tests/e2e --headed --slowmo 0.5` | Watchable pace, for debugging |
| `pytest tests/e2e -n auto` | Parallel (needs `pytest-xdist`) |
| `pytest tests/e2e/test_landing.py -k mobile` | One file / one pattern |

## Environment variables

| Variable | Default | Purpose |
|---|---|---|
| `TESSERA_BASE_URL` | `http://localhost:3000` | App under test |
| `TESSERA_TEST_EMAIL` | — | Account for the `auth` tests |
| `TESSERA_TEST_PASSWORD` | — | Its password |

The `auth` tests additionally need **real** Supabase keys in the project's
`.env.local` (see `.env.example`). With the placeholder keys that ship for local
development, sign-in cannot succeed, so those tests are skipped:

```bash
export TESSERA_TEST_EMAIL=you@example.com
export TESSERA_TEST_PASSWORD=...
pytest tests/e2e -m auth
```

## Layout

```
conftest.py          dev-server + browser fixtures, --headed/--slowmo flags,
                     and `seeded_book` — test data created straight through the
                     Supabase REST API
fixtures/            a tiny PNG and a non-image file, for the upload tests
pages/base_page.py   wait helpers — every selector is a data-testid
pages/*.py           one page object per route
test_landing.py      the hero: content, one-screen layout, mobile, reduced motion
test_navigation.py   public routes, cross-links, route guard, 404
test_auth.py         @auth — login, redirect-back, sign out
test_board.py        @auth — fragment CRUD: upload, drag, edit, delete
```

### Test data

`test_board.py` does not rely on whatever happens to be in the account. The
`seeded_book` fixture creates **a fresh book with characters and fragments for
every test** and deletes it afterwards — including the files its upload tests
put in Storage, which the database cascade does not touch.

Per-test rather than per-session on purpose: these tests add and move fragments,
so on a shared board the cards piled up until they overlapped and a click landed
on the wrong one — failures that depend on test order rather than on the code.

`test_board.py` also needs `supabase/migrations/005_fragment_images.sql` to have
been run once, or the upload tests fail with "Image storage isn't set up yet".

## Conventions

- **Selectors are `data-testid` only.** Tailwind classes change whenever the
  design is retouched; a testid is an explicit contract. When you add one to a
  component, add it to the matching page object too — tests never query the DOM
  directly.
- **No `time.sleep`.** Everything waits on a condition (`BasePage._wait`).
  Next.js hydrates asynchronously, so a fixed pause is either flaky or slow.
  `wait_for_hydration()` exists because a button can be in the DOM before its
  click handler is attached — the classic source of flaky Next.js tests.
- **The browser is session-scoped, its state is not.** The `driver` fixture
  clears cookies *and* `localStorage` before each test, because Supabase keeps
  the session in `localStorage` — otherwise a signed-in test would leak into
  the next one.
