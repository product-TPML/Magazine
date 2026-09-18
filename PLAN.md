# Custom magazine reader UI — plan

Context: build a custom mobile-first reader over the extracted editions in `data/` (see `AGENTS.md` for mandatory UI rules). Static app — no backend; all data is local.

## Base UX

- Opens on the **front page (cover)** of the current edition.
- **Page strip:** one page + ~20% peek of the next page visible side by side; horizontal swipe scrolls the strip.
- **Edge swipe** (outer ~24px of the screen) changes exactly one page; tapping the left/right edge zones does the same (keyboard `←`/`→` on desktop).
- **Prev/next buttons:** visible `◀` / `▶` beside the page indicator (44px targets, disabled on first/last page) — the discoverable equivalent of the edge zones; same action at every screen size.
- **Mode toggle (ಪುಟ ⇄ ಪಠ್ಯ):** floating segmented control, same screen position in both views, switches between the page reader and the text view of the current article. **Absent on pages without an article.**
- **Header and nav are contextual:** they change between page view and text view (see below) — same DOM, elements swapped by view state, no duplicated markup.
- **Header (page view):** edition selector — current edition chip (mini cover + date); tapping opens a cover-grid sheet built from `issues.json` + `cover.jpg`. Sudha/Mayura switcher above it.
- **Search** lives in the page-view header (icon): in-issue search over article titles, bylines, and full text (article HTML is local; index at runtime).

## Bottom nav (contextual)

**Page view — 3 items**
1. **ವಿಷಯ Contents** — article TOC from `coords.json` + `bylines.json`, grouped by section (headline, byline, page). Tap → jump to page and open the article text. Fallback to page list on issues without articles.
2. **ಪುಟಗಳು Pages** — thumbnail grid from `thumbs/` with the current page highlighted, plus a scrub slider for long issues (up to 165 pages).
3. **ಸೇವ್ Saved** — bookmarks (pages/articles) and resume position per edition, stored in `localStorage`.

**Text view — 3 items**
1. **ವಿಷಯ Contents** — jump to another article.
2. **ಕೇಳಿ Listen** — play/pause the article being read aloud; mini player above the nav with speed and voice picker, current sentence highlighted. Web Speech API (`lang="kn-IN"`, device voices); disabled with a hint if the device has no Kannada voice. Playback stops when leaving the text view.
3. **ಸೇವ್ Saved** — same bookmarks/resume store.

Items reflect what you can do in the current view; the same DOM is swapped by view state (no duplicated markup, no override styles).

### Mode toggle (ಪುಟ ⇄ ಪಠ್ಯ)

- Persistent floating segmented control; **identical position in page view and text view** (bottom-right, above the nav; ≥44px targets) so it is muscle memory.
- Text side opens the **primary article hotspot of the current page** (largest area; last-opened article wins within the session).
- **Absent on pages without an article** (not merely disabled) — Contents remains the way to browse articles.
- Both sides are **real links** (reader `?p=N` ⇄ static article URL): deep-linkable and crawlable.
- `≥1024px`: the same control sits in the header; the rail mirrors the contextual items.

### Text view chrome

- **Header (two rows, collapses on scroll):** `←` back to the source page · article title (truncates to one line when collapsed) · `☆` save · `⋮` more (share, open in pages, switch edition). Meta row: byline · section · page no., text size `ಅ−` / `ಅ+`. A thin reading-progress line sits under the header. The edition chip/search from page view are hidden here — one header element, contextual content.
- **Bottom nav (text view):** Contents · Listen · Saved.
- **Prev/next article** live in the article footer (and are crawlable links in the static pages), never as nav items.

## Layout adaptation (same DOM, `min-width` only)

- Base: slide = `80vw` + gap → 20% peek; `scroll-snap-type: x mandatory`.
- `≥1024px`: slide = `50vw` → true 2-page spread.
- Bottom nav becomes a left rail on desktop (mirroring the contextual items); TOC/Pages sheets become persistent side panels; the mode toggle moves to the header — repositioned via the same rules, no duplicate markup or override stylesheets.

## Gestures

- Drag anywhere = native horizontal scroll with snap (may skip pages).
- Edge swipe / edge taps = exactly ±1 page; `◀`/`▶` buttons mirror this.
- Article hotspots on a page (from `coords.json`) open the text view for that article.

### Pinch zoom (page images)

- Two-finger pinch zooms the current page, anchored at the pinch midpoint. Range is **1×–4×**, where 1× is the default fit (page fills the viewport).
- **Zoom-out is clamped at 1×** — the page can never shrink below the default fit; releasing a pinch below 1× snaps back to 1× (no rubber-band shrink).
- Double-tap toggles ×2 at the tap point; single-finger drag pans when zoomed (the page strip is frozen).
- While zoomed, edge swipe/taps and `◀`/`▶` are disabled — a `⟲` reset chip (or zooming back to 1×) returns to fit; zoom resets on page change.
- Native browser page zoom stays enabled (never `user-scalable=no`); visible `+ / −` controls are provided for keyboard/AT users.
- Desktop: `Ctrl`/`⌘` + wheel and `+ / −` buttons; same reset chip.
- Article images in the text view get the same pinch/double-tap zoom.
- Implementation: Pointer Events with a custom transform; native pinch suppressed on the page area (`touch-action: pan-x pinch-zoom` at 1×, takeover on the second pointer).

## Other features

- Preload only n±1 pages (`IntersectionObserver`); never decode the whole issue.
- Dark/sepia reading theme, follows `prefers-color-scheme`.
- Share / download: current page image or `edition.pdf` via Web Share API.
- Resume + bookmarks stored locally; no account needed.

## SEO (text view must be crawlable)

- **Static pages are canonical.** A build step generates real HTML from `data/` (article fragments embedded at build time, no client fetch):
  - `/{pub}/{date}/` — edition index (cover + TOC linking every article)
  - `/{pub}/{date}/{slug}-{id}/` — article page (full `.bodytext`, images, byline)
  - `/` — home listing editions/articles; plus `sitemap.xml` and `robots.txt`
- **Reader shell is `noindex`** (`/{pub}/{date}/read/`); static pages link into the reader at the matching page (`?p=N`).
- Per-article head: `<title>` (headline · Sudha/Mayura · date), meta description, canonical, Open Graph/Twitter, `<html lang="kn">`, JSON-LD `NewsArticle` (headline, author, datePublished, publisher, image).
- Images: explicit width/height, meaningful alt (caption/headline), lazy below the fold — good Core Web Vitals.
- Slugs: from the headline (Kannada kept, URL-encoded) with a stable `-{articleId}` suffix; id-only fallback.
- Header search indexes the static corpus (build-time `search-index.json`) so search matches exactly what crawlers see.

## Data mapping

| Feature | Source |
| --- | --- |
| Page strip, spread | `pages/{id}.png`, `coords.json` (page order) |
| Pages grid, scrubber | `thumbs/{id}.png` |
| Contents / TOC | `coords.json` hotspots, `bylines.json`, `index.json` |
| Text view | `articles/{id}.html`, `media/*.jpg` |
| Edition selector | `issues.json`, `cover.jpg` |
| Search | article HTML fragments + `bylines.json` |
| Listen (TTS) | article text + device voices (Web Speech API, `kn-IN`) |
| SEO static pages | all of the above, emitted by the build step |

## Milestones

- [ ] Scaffold app shell: header, page strip, bottom nav (single HTML + single stylesheet)
- [ ] Page strip with snap + edge swipe/taps
- [ ] Pinch zoom (page + article images): pan, double-tap, reset chip, `+ / −`
- [ ] Prev/next page buttons + next-article link
- [ ] Contents sheet + Pages grid + scrubber
- [ ] Text view + contextual header/nav + mode toggle + text size
- [ ] Listen (Web Speech API): mini player, sentence highlight, graceful unsupported state
- [ ] Saved: bookmarks + resume
- [ ] Header search
- [ ] SEO build: static edition/article pages, JSON-LD, sitemap/robots
- [ ] Desktop adaptations (spread, rail, side panels)
- [ ] Verify at 360px and ≥1280px, no horizontal scroll on mobile

## Wireframes

### Mobile — reader (default)

```text
┌──────────────────────────────────────────────┐
│ ಸುಧಾ ▾   ಸೆಪ್ಟೆಂ 24, 2026 ▾            ⌕   ⋮ │
├──────────────────────────────────────────────┤
│ ┌──────────────────────────┐┌───────┐        │
│ │                          ││       │        │
│ │                          ││       │        │
│ │         PAGE 1           ││ PAGE 2│        │
│ │        (cover)           ││ ~20%  │        │
│ │                          ││       │        │
│ │                          ││       │        │
│ └──────────────────────────┘└───────┘        │
│                                 ┌──────────┐ │
│                                 │ಪುಟ | ಪಠ್ಯ │ │  ← mode toggle
│                                 └──────────┘ │
│ ●─────────────────────────────────────       │
│           ◀       ಪುಟ 1 / 64       ▶         │
├──────────────────────────────────────────────┤
│       ವಿಷಯ          ಪುಟಗಳು          ಸೇವ್      │
└──────────────────────────────────────────────┘
← edge zones: ±1 page   |   drag: free scroll with snap →
```

### Mobile — reader (zoomed)

```text
┌──────────────────────────────────────────────┐
│ ಸುಧಾ ▾   ಸೆಪ್ಟೆಂ 24, 2026 ▾            ⌕   ⋮ │
├──────────────────────────────────────────────┤
│ ┌──────────────────────────────────────────┐ │
│ │ ┌──────────────────────────────────────┐ │ │
│ │ │   enlarged page area                 │ │ │
│ │ │   (single-finger pan; strip frozen)  │ │ │
│ │ └──────────────────────────────────────┘ │ │
│ │   2.4×                        ⟲ reset    │ │
│ └──────────────────────────────────────────┘ │
│                                 ┌──────────┐ │
│                                 │ಪುಟ | ಪಠ್ಯ │ │
│                                 └──────────┘ │
│           ◀       ಪುಟ 1 / 64       ▶         │
├──────────────────────────────────────────────┤
│       ವಿಷಯ          ಪುಟಗಳು          ಸೇವ್      │
└──────────────────────────────────────────────┘
```

### Mobile — Contents sheet (bottom sheet)

```text
┌──────────────────────────────────────────────┐
│ ░░░░░░  reader dimmed behind  ░░░░░░░░░░░░░░ │
├──────────────────────────────────────────────┤
│ ══════════  handle                      ✕    │
│ ವಿಷಯ / Contents                              │
│ ──────────────────────────────────────────── │
│ ಲೇಖನಗಳು                                      │
│   ಟೀಚರ್ · ಕಾವ್ಯಾ ಕಡಮೆ · ಪುಟ 40            → │
│   ಸುಮಾನಿ ಬಸವನ ಪರಾಕ್ರಮ · ... · ಪುಟ 22      → │
│ ──────────────────────────────────────────── │
│ ಸ್ಥಿರ ಶೀರ್ಷಿಕೆಗಳು                             │
│   ಸಂಪಾದಕೀಯ · ಪುಟ 3                        → │
└──────────────────────────────────────────────┘
```

### Mobile — Pages grid (quick jump)

```text
┌──────────────────────────────────────────────┐
│ ░░░░░░  reader dimmed behind  ░░░░░░░░░░░░░░ │
│ ಪುಟಗಳು / Pages                           ✕   │
│ ┌───┐  ┌───┐  ┌───┐  ┌───┐  ┌───┐            │
│ │ 1 │  │ 2 │  │ 3 │  │ 4 │  │ 5 │            │
│ └───┘  └───┘  └───┘  └───┘  └───┘            │
│ ┌───┐  ┌───┐  ┏━━━┓  ┌───┐  ┌───┐            │
│ │ 6 │  │ 7 │  ┃ 8 ┃  │ 9 │  │ 10│  ← current │
│ └───┘  └───┘  ┗━━━┛  └───┘  └───┘            │
│          ●────────────────────  ಪುಟ 8 / 64   │
└──────────────────────────────────────────────┘
```

### Mobile — text view (article)

```text
┌──────────────────────────────────────────────┐
│ ←   ಟೀಚರ್                            ☆    ⋮ │
│ ಕಾವ್ಯಾ ಕಡಮೆ · ಕಥೆ · ಪುಟ 40        ಅ−    ಅ+   │
├──────────────────────────────────────────────┤
│ ▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │ ← progress
│  ಯಾವಾಗಲೂ ಕ್ಲಾಸಿನಲ್ಲಿ ಫಸ್ಟ್ ರ್ಯಾಂಕ್ ಬರೋ       │
│  ಮಕ್ಕಳಿಗೆ ಆ ಖುಷಿಯ ಅರಿವಿರೋದಿಲ್ಲ. ಆ ಸ್ಥಾನವನ್ನ  │
│  ...                                         │
│  ┌────────────────────────────────┐          │
│  │        media/<id>.jpg          │          │
│  └────────────────────────────────┘          │
│  ...                                         │
│  ─────────────────────────────────────       │
│  ಮುಂದಿನ ಲೇಖನ →  ಸುಮಾನಿ ಬಸವನ ಪರಾಕ್ರಮ          │
│                                 ┌──────────┐ │
│                                 │ಪುಟ | ಪಠ್ಯ │ │  ← mode toggle
│                                 └──────────┘ │
├──────────────────────────────────────────────┤
│  ⏵  ಕೇಳಿ · 1.0×                        ⏸    │  ← listen mini player
├──────────────────────────────────────────────┤
│       ವಿಷಯ           ಕೇಳಿ           ಸೇವ್     │
└──────────────────────────────────────────────┘
```

### Mobile — Edition selector sheet

```text
┌──────────────────────────────────────────────┐
│ ░░░░░░  reader dimmed behind  ░░░░░░░░░░░░░░ │
│ ಸಂಚಿಕೆ ಆಯ್ಕೆಮಾಡಿ / Editions              ✕   │
│   [ ಸುಧಾ ]    ಮಯೂರ                            │
│  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐      │
│  │cover │  │cover │  │cover │  │cover │      │
│  │ 9/24 │  │ 9/17 │  │ 9/03 │  │ 8/20 │      │
│  └──────┘  └──────┘  └──────┘  └──────┘      │
│  ┌──────┐  ┌──────┐  ...                     │
│  │ 8/13 │  │ 8/06 │                          │
│  └──────┘  └──────┘                          │
└──────────────────────────────────────────────┘
```

### Desktop — reader (same DOM, `min-width` only)

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ ಸುಧಾ ▾  ಸೆಪ್ಟೆಂ 24, 2026 ▾     [ಪುಟ | ಪಠ್ಯ]        ⌕    ↗    ⤓    ⋯                 │
├─────────┬──────────────────────────────────────────────────────────────────────────────┤
│ ವಿಷಯ    │                                                                              │
│ ಪುಟಗಳು  │       ┌─────────────────────┐   ┌─────────────────────┐                      │
│ ಸೇವ್    │       │                     │   │                     │                      │
│         │       │                     │   │                     │                      │
│         │       │       PAGE 1        │   │       PAGE 2        │                      │
│ (rail)  │       │                     │   │                     │                      │
│         │       │                     │   │                     │                      │
│         │       └─────────────────────┘   └─────────────────────┘                      │
│         │                                                                              │
│         │           ◀        ●─────────────────────  ಪುಟ 1–2 / 64        ▶            │
└─────────┴──────────────────────────────────────────────────────────────────────────────┘
Contents / Pages open as a persistent side panel (same markup); the rail mirrors the
contextual nav (page view: ವಿಷಯ / ಪುಟಗಳು / ಸೇವ್ — text view: ವಿಷಯ / ಕೇಳಿ / ಸೇವ್);
the mode toggle moves into the header; keyboard ← / → flip pages.
```
