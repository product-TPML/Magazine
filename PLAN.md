# Custom magazine reader UI — plan

> This is a local functional prototype intended to validate the Sudha/Mayura reading experience. Production authentication, entitlement, paywall, SEO, publishing automation and content security are V2 concerns.

Context: build a custom mobile-first reader over the extracted editions in `data/` (see `AGENTS.md` for mandatory UI rules). Static app — no backend; all data is local. Prototype deep links: `?p=12&article=123&view=text`.

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
- Both sides are **real links** (`?p=N` ⇄ `?p=N&article=ID&view=text`): deep-linkable; crawlable once the V2 static pages exist.
- `≥1024px`: the same control sits in the header; the rail mirrors the contextual items.

### Text view chrome

- **Header (two rows, collapses on scroll):** `←` back to the source page · article title (truncates to one line when collapsed) · `☆` save · `⋮` more (share, open in pages, switch edition). Meta row: byline · section · page no., text size `ಅ−` / `ಅ+`. A thin reading-progress line sits under the header. The edition chip/search from page view are hidden here — one header element, contextual content.
- **Bottom nav (text view):** Contents · Listen · Saved.
- **Prev/next article** live in the article footer (real links; crawlable once the V2 static pages exist), never as nav items.

## Layout adaptation (same DOM, `min-width` only)

- Base: slide = `80vw` + gap → 20% peek; `scroll-snap-type: x mandatory`.
- `≥1024px`: slide = `50vw` → true 2-page spread.
- Bottom nav becomes a left rail on desktop (mirroring the contextual items); TOC/Pages sheets become persistent side panels; the mode toggle moves to the header — repositioned via the same rules, no duplicate markup or override stylesheets.

## Gestures

- Drag anywhere = native horizontal scroll with snap (may skip pages).
- Edge swipe / edge taps = exactly ±1 page; `◀`/`▶` buttons mirror this.
- Article hotspots on a page (from `coords.json`) open the text view for that article.

### Pinch zoom (page images)

Prototype status: skipped by request; native browser zoom remains enabled.

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

## V2 / production considerations

Not implementation targets for the prototype — listed so the phased scope is explicit:

- **Authentication, entitlement, checkout/paywall flows.**
- **SEO:** static edition/article pages generated from `data/` at build time, per-article metadata + JSON-LD `NewsArticle`, `sitemap.xml`/`robots.txt`; reader shell stays `noindex`; slugs from headline + stable `-{id}` suffix.
- **Publishing automation, monitoring/rollback, content security.**

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

## Milestones

### Prototype Core

- [x] App shell: header, page strip, bottom nav (single HTML + single stylesheet) — Status: Done
- [x] Sudha/Mayura + edition selection — Status: Done
- [x] Page strip: swipe, snap, and prev/next controls — Status: Done
- [x] Pages thumbnail grid — Status: Done
- [x] Article hotspots (tap → text view) — Status: Done
- [x] Page ⇄ text toggle — Status: Done
- [x] Contents navigation — Status: Done
- [x] Mobile layout verified at 360–390px — Status: Done
- [x] Basic desktop adaptation (spread, rail, panels) — Status: Done
- [x] Lazy-loading for long editions (164-page Mayura) — Status: Done
- [x] Local resume position — Status: Done

### Prototype Polish

- [x] Search — Status: Done; searches article titles, bylines, sections, and loaded article text
- [x] Saved/bookmarks — Status: Done; saves pages and articles in local storage
- [x] Text-size controls — Status: Done
- [x] Reading progress — Status: Done
- [x] Share/download (page image, `edition.pdf`) — Status: Done; shares files with Web Share when supported and downloads them otherwise
- [x] Dark/sepia themes — Status: Done; follows the system preference by default and persists the user choice
- [x] More elaborate desktop panels — Status: Done; persistent rail and side panels at desktop widths
- [~] Custom pinch/pan zoom — Status: Skipped by request
- [x] Kannada TTS + sentence highlighting — Status: Done; disabled with a device hint when no Kannada voice exists
- [x] Edge-swipe navigation (may fight browser/OS back gestures) — Status: Done; edge taps and edge swipes move one page

### V2 Production

- [ ] Authentication, entitlement, checkout/paywall — Status: Deferred to V2
- [ ] SEO static pages, metadata/JSON-LD, sitemap/robots — Status: Deferred to V2
- [ ] Publishing automation, monitoring/rollback, content security — Status: Deferred to V2

## Prototype risks to watch

Observe during testing — these affect what we learn, not the build order:

- Mobile edge swipes can trigger browser/OS back gestures.
- Page hotspots may accidentally open while the user is swiping.
- Auto-choosing the largest article hotspot may confuse on multi-article pages.
- Custom pinch zoom can conflict with horizontal page swiping.

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
