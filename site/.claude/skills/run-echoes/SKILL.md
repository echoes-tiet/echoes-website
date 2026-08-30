---
name: run-echoes
description: Build, start, and drive the Echoes Astro site (site/). Use when asked to run the site, start its dev server, build it, take a screenshot of a page, check for broken links, or verify a UI change (hover/scroll interactions) actually renders correctly.
---

This is an Astro 7 static site (Tailwind v4, content collections, no server-side code) at `site/`. It's driven with a small Playwright-based CLI at `.claude/skills/run-echoes/driver.mjs`, because `chromium-cli` is not available in this environment (confirmed: `chromium-cli --version` → command not found) — Playwright fills that role instead, launched directly from Node.

All paths below are relative to `site/` (the repo root also holds an old, unrelated flat-HTML site — `site/` is the actual app).

## Prerequisites

Node >=22.12.0 (`package.json` `engines.node`). Verified working here with Node v24.15.0 / npm 11.12.1. No OS packages needed — this was run and verified on macOS; Playwright's bundled Chromium doesn't require system Chrome.

## Setup

```bash
cd site
npm install
```

This installs `astro`, `@tailwindcss/vite`, `cheerio`, `swiper`, `glightbox`, and `playwright` (a real `devDependency` — it's used by the driver below, so unlike most projects it's *not* one-off tooling to install-and-discard).

One-time only, the first time Playwright's browser runs on a machine (its binary is cached outside the repo, so this survives `npm install`/`rm -rf node_modules` cycles and normally never needs repeating):

```bash
npx playwright install chromium
```

## Build

```bash
npm run build
```

Outputs static HTML to `dist/` (114 pages as of this writing). Takes about 1-2 seconds.

## Run (agent path)

Use the driver. It manages the dev server lifecycle and takes screenshots with optional scroll/hover interaction, which is what this site actually needs — several homepage sections (the editions coverflow, blog/newsletter "scroll cards") only show their real behavior once you scroll them into view or hover a card.

```bash
node .claude/skills/run-echoes/driver.mjs up                # starts astro dev --background, polls until it responds
node .claude/skills/run-echoes/driver.mjs shot / home.png   # screenshots a route, saved under .claude/skills/run-echoes/shots/
node .claude/skills/run-echoes/driver.mjs down               # stops the dev server
```

Verified this session: `up` → three `shot` calls (plain page, a blog post, and one exercising `--scroll`+`--hover` against the editions coverflow) → `down`, all succeeded; the hover screenshot showed the correct centered/expanded card. `linkcheck` was also run standalone and passed (114 pages, 0 broken links/images).

| command | what it does |
|---|---|
| `up` | `npx astro dev --background`, then polls `http://localhost:4321` (up to 30s) until it responds |
| `down` | `npx astro dev stop` |
| `shot <path> [out.png]` | Navigates to `path`, screenshots to `.claude/skills/run-echoes/shots/<out>` (default name derived from the path). Requires `up` first. |
| `shot ... --scroll=<selector>` | `scrollIntoView({block:'center'})` on that element before shooting — needed for anything gated by an `IntersectionObserver` entrance animation |
| `shot ... --hover=<selector>` | Hovers that element (after any `--scroll`) before shooting — needed for hover-revealed states (card captions, coverflow expansion, nav underlines) |
| `shot ... --wait=<ms>` | Extra wait after scroll/hover for CSS transitions to finish (default 500ms) |
| `shot ... --width=<px> --height=<px>` | Viewport size (default 1400x1000) |
| `linkcheck` | Runs `npm run build`, then verifies every internal `href`/`src` in `dist/` resolves to a real file. Exits non-zero if anything's broken. |

`shot` also collects browser console/page errors during the visit and prints them if any occurred — useful for catching a broken client-side script (like one of the scroll-observer components) without eyeballing the screenshot.

For anything the driver's flags don't cover (a real drag gesture, a multi-step click sequence, reading computed styles) — write a short one-off script the same way; the driver's `shot()` function is a ~30-line template for exactly that. Example, confirming the recruitment badge under the hero wordmark actually navigates:

```js
import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
await page.goto('http://localhost:4321/');
await page.click('a[href="/register/"]');
await page.waitForLoadState('networkidle');
console.log(page.url()); // -> http://localhost:4321/register/
await browser.close();
```

## Run (human path)

```bash
cd site
npm run dev     # opens a normal foreground dev server at http://localhost:4321, Ctrl-C to stop
```

Useless for an agent (foreground, blocks the terminal) — use `driver.mjs up`/`down` instead.

## Test

There is no separate test suite. `linkcheck` (above) is the closest thing to one and is the right one to run after any content or routing change.

---

## Gotchas

- **`chromium-cli` is not available in this environment.** Confirmed by running `chromium-cli --version` (command not found). Don't spend time looking for it — the Playwright driver above is the actual working path.
- **Playwright's browser binary is separate from the npm package**, and the first launch on a fresh machine fails with `Executable doesn't exist at .../chromium_headless_shell.../headless_shell ... Please run: npx playwright install`. Run `npx playwright install chromium` once (~95MB download); after that it's cached outside `node_modules` and survives reinstalling the npm package.
- **The shell `timeout` command doesn't exist on this machine** (macOS without GNU coreutils) — `timeout 30 bash -c '...'` (as the generic tmux-driver pattern suggests) fails with `command not found`, not a timeout. The driver's `waitForServer()` uses a plain JS polling loop instead; do the same in any ad hoc script rather than reaching for shell `timeout`.
- **A full-page (`fullPage: true`) screenshot of a long page can make images look broken when they aren't.** `loading="lazy"` images far down the page (e.g. the Core team grid) may not have loaded yet when Playwright stitches the composite screenshot, and show as blank. Verified this directly: a "missing images" scare turned out to be every one of those files present and correctly referenced — it was purely a lazy-load timing artifact of the screenshot method, not a real bug. Don't trust a full-page screenshot alone to prove images are broken; check the actual `<img src>` and confirm the file exists, or screenshot the specific viewport instead of the whole page.
- **`<a>` and `<img>` are natively draggable in browsers**, which silently breaks any custom pointer-based drag/swipe interaction (used by the editions coverflow) if you're scripting a drag via `page.mouse.down()` → `move()` → `up()`: the browser's native "drag this link/image" gesture hijacks the sequence and `pointerup` never fires. Diagnosed by attaching a `dragstart` listener, which fired on the `<a>`. If a drag-driven interaction test isn't registering, check for `draggable="false"` on the dragged element before assuming the interaction code is broken.

## Troubleshooting

- **`shot` exits with a `Cannot find module 'playwright'`-style error**: `npm install` wasn't run (or `playwright` was pruned). Re-run `npm install` from `site/`.
- **`up` prints "server did not respond ... within 30s"**: check `npx astro dev logs` from `site/` for the actual startup error (usually a syntax error in a recently-edited `.astro` file — the dev server fails to bind but the background process can still be "running").
- **A second `up` seems to hang or do nothing new**: a dev server from a previous session is probably already bound to port 4321. Run `down` first, or `npx astro dev status` to check.
