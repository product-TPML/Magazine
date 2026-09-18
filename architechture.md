# Architecture — Sudha_Mayura

Purpose: extract, archive, and present Sudha/Mayura e-magazine editions (The Printers Mysore) through a custom mobile-first reader UI. Content comes from the public web edition (`vartasetu-magazine.tpml.in`) and its CDN mirror, and is consumed locally — no backend.

## Components

- `fetch_edition.ps1` — edition extractor (PowerShell 5.1, `curl.exe`, headless Chrome for PDF). Parameterized by `-Pub su|my -Date yyyy-MM-dd`.
- `data/{PUB}-{YYYY-MM-DD}/` — local archive (gitignored, ~1.25 GB for 11 editions):
  - `pages/`, `thumbs/`, `articles/`, `media/`
  - `index.json`, `bylines.json`, `langs.json`, `issues.json`, `coords.json`, `cover.jpg`, `edition.pdf`
- `api docs/vartasetu-magazine-web.md` — single source of truth for the platform's web/API surface (endpoints, auth, session renewal, CDN mirror).
- `AGENTS.md` — mandatory UI rules for agents (mobile-first, single source of styles, minimal diffs).
- `PLAN.md` — custom reader UI plan (UX, wireframes, phased prototype milestones).
- `TECHNICAL_IMPLEMENTATION.md` — technical prototype plan (stack, data contracts, state, implementation sequencing, acceptance criteria).
- Session artifacts (gitignored, credentials): `cookies.txt`, `cookie_header.txt`, `playwright_state.json`.

## Data flow

1. A signed-in browser session yields `we_idt`/`we_uid` cookies; `GET /api/flip/token?pub&date` mints an issue-scoped, ~3 h `flip_token`.
2. `fetch_edition.ps1` downloads the manifest, all page images and thumbs, article HTML fragments, and article body photos — CDN first, site host + per-issue token as fallback (parallel downloads via `curl --config`).
3. It derives `coords.json` (page order + article/ad hotspot geometry) and builds `edition.pdf` from the page images via headless Chrome.
4. The planned reader (see `PLAN.md`) reads `data/` directly as a static app.

## Key platform facts

- The CDN mirror (`d3fe7ja3iahxpd.cloudfront.net`) serves the flipbook asset tree without authentication, including back issues; the site host enforces the issue-scoped `flip_token`.
- Sessions renew server-side (`/api/account/sessions`) and can be silently re-authenticated headlessly via `/auth/login?from=…` while the SSO refresh token (~100 days) is alive.
- Legacy-format issues (e.g. Sudha 2025-11-20) have no article hotspots and are skipped by policy.
- en/hi article variants exist upstream but the UI intentionally ships Kannada only.

## External tools

PowerShell 5.1 · `curl.exe` · Google Chrome (headless `--print-to-pdf`) · Playwright MCP browser (extraction/debug sessions).
