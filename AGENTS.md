# Sudha_Mayura — custom magazine reader UI

Context: this repo holds extracted Sudha/Mayura e-magazine editions (`data/`), the `fetch_edition.ps1` extractor, and `api docs/`. Goal: a custom mobile-first reader UI over this content.

## UI rules (mandatory for all agents)

1. **Mobile-first, desktop-adaptable.**
   Base CSS targets ~360–390px. Adapt upward only with `min-width` media queries (480 / 768 / 1024 / 1280 as needed). Same DOM and same rules at every size — only values change (columns, gutters, type scale). No per-device component forks.

2. **One source of truth for styles.**
   No separate override stylesheets, no duplicate selectors fighting in the cascade, no `!important` patches, no "mobile.css + desktop.css" split. Change the original rule in place; when a breakpoint needs different values, add a `min-width` query next to that same rule.

3. **Adjust original code, don't layer on top.**
   Edit existing markup/components/styles in place; prefer modifying over adding files. Keep diffs minimal. No parallel copies of components or styles. If a new file is genuinely required, say why in one line.

4. **Fluid by default.**
   Fluid widths, `max-width` containers, `clamp()` for type and spacing, intrinsic images (`max-width:100%; height:auto`), safe-area insets, `dvh` where viewport height matters.

5. **Accessibility is not optional.**
   Semantic HTML, keyboard reachable, visible focus states, contrast ≥ 4.5:1, touch targets ≥ 44px, `prefers-reduced-motion` respected. Never simplify these away.

6. **Performance.**
   An edition has 60–165 page images. Lazy-load below-the-fold pages and thumbs, size-constrain them, and never decode a whole issue at once.

## Verify every UI change

Render at **360px** and **≥1280px** in a real browser before calling it done; no horizontal scroll on mobile.

## Content layout (what the UI renders)

`data/{PUB}-{YYYY-MM-DD}/` where `PUB` is `MY` (Mayura) or `SU` (Sudha):

- `pages/{id}.png` — full page image (JPEG bytes)
- `thumbs/{id}.png` — thumbnail for page strips / all-pages view
- `articles/{id}.html` (+ `{id}.en.html`, `{id}.hi.html`) — article fragments: `.articleDetail` → `h1`, `.pictures`, byline, `.bodytext`; image `src` paths are legacy `data/.../photos/<file>` and map to local `media/<file>`
- `media/*.jpg` — article body photos
- `coords.json` — page records with `imgFile`, `imgThumbFile`, `pdfFile`, and article/ad hotspots (`top`/`left`/`width`/`height` in %) including `htmlFile` and `contentElementId`
- `index.json`, `bylines.json`, `langs.json`, `issues.json` — manifests/metadata (`bylines.json` may be missing on old issues)
- `cover.jpg`, `edition.pdf` — cover and assembled PDF

Source APIs, auth, and session behavior: see `api docs/vartasetu-magazine-web.md`.
