# Sudha–Mayura Magazine Reader: Technical Prototype Plan

## 1. Prototype objective

Build a mobile-first functional prototype that validates whether readers can:

* Browse complete Sudha and Mayura editions as page images.
* Move efficiently through issues containing 60–165 pages.
* Discover articles through page hotspots and Contents.
* Switch between the designed magazine page and readable article text.
* Resume reading and move between editions.
* Use the same experience on mobile and desktop.

The prototype uses locally extracted content under `data/`. It does not require production authentication, entitlements, payment, paywall, SEO, publishing automation or backend infrastructure.

## 2. Explicit non-goals

These are V2 production concerns:

* AccessType or subscription entitlement integration.
* Login and account handling.
* Preview limits and paywall.
* Checkout and subscription purchase.
* Production content ingestion and scheduling.
* Protected asset delivery.
* Server rendering and SEO.
* Analytics production configuration.
* Cross-device bookmarks and resume.
* Offline/PWA support.

The prototype may keep lightweight interfaces where useful for future replacement, but should not build these systems now.

---

## 3. Recommended technical stack

### Application

* React
* TypeScript
* Vite
* React Router
* Plain CSS with one primary stylesheet
* Vitest for unit tests
* Playwright for browser testing

React is appropriate because the reader has several interacting states: current edition, page, article, open panel, zoom, speech and saved state. TypeScript will also make inconsistent edition data easier to handle.

Avoid a UI framework or Tailwind for the prototype. The interface is custom, and the repository explicitly requires a single, predictable style source.

### Optional small dependencies

Use dependencies only where they remove substantial implementation work:

* `zod` for validating generated manifests.
* `cheerio` in the data preparation script for parsing article HTML.
* A small search library such as MiniSearch, or a simple custom search because each issue contains relatively few articles.

Do not introduce a global state-management library. React context plus a reducer is sufficient.

---

## 4. Proposed repository structure

```text
Magazine/
├── AGENTS.md
├── PLAN.md
├── architechture.md
├── fetch_edition.ps1
├── data/
│   ├── SU-2026-09-24/
│   └── MY-2026-09-01/
├── scripts/
│   ├── build-content-index.ts
│   ├── validate-edition.ts
│   └── package-prototype.ts
├── generated/
│   ├── catalog.json
│   └── editions/
│       ├── SU-2026-09-24.json
│       └── MY-2026-09-01.json
├── src/
│   ├── app/
│   │   ├── App.tsx
│   │   ├── router.tsx
│   │   ├── ReaderContext.tsx
│   │   └── readerReducer.ts
│   ├── components/
│   │   ├── AppHeader.tsx
│   │   ├── ContextNav.tsx
│   │   ├── ModeToggle.tsx
│   │   ├── PanelHost.tsx
│   │   └── Icon.tsx
│   ├── features/
│   │   ├── reader/
│   │   │   ├── PageReader.tsx
│   │   │   ├── PageStrip.tsx
│   │   │   ├── PageSlide.tsx
│   │   │   ├── PageHotspots.tsx
│   │   │   ├── PageControls.tsx
│   │   │   └── ZoomSurface.tsx
│   │   ├── article/
│   │   │   ├── ArticleView.tsx
│   │   │   ├── ArticleHeader.tsx
│   │   │   ├── ArticleBody.tsx
│   │   │   └── ArticleFooter.tsx
│   │   ├── contents/
│   │   │   └── ContentsPanel.tsx
│   │   ├── pages/
│   │   │   └── PagesPanel.tsx
│   │   ├── editions/
│   │   │   └── EditionPanel.tsx
│   │   ├── saved/
│   │   │   └── SavedPanel.tsx
│   │   ├── search/
│   │   │   └── SearchPanel.tsx
│   │   └── listen/
│   │       ├── SpeechController.ts
│   │       └── ListenPlayer.tsx
│   ├── content/
│   │   ├── ContentRepository.ts
│   │   ├── LocalContentRepository.ts
│   │   ├── articleParser.ts
│   │   └── types.ts
│   ├── storage/
│   │   └── readerStorage.ts
│   ├── styles/
│   │   └── app.css
│   └── main.tsx
├── tests/
│   ├── fixtures/
│   ├── unit/
│   └── e2e/
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

The generated files should be committed only if convenient for the prototype. Extracted page images and article content can remain ignored.

---

## 5. Data preparation layer

The UI should not directly interpret every raw file independently. Add a preparation script that normalizes each extracted edition into one predictable manifest.

### Inputs

For each edition:

```text
data/{EDITION_KEY}/
├── pages/
├── thumbs/
├── articles/
├── media/
├── coords.json
├── index.json
├── bylines.json
├── issues.json
└── cover.jpg
```

### Generated catalog

`generated/catalog.json`:

```ts
interface MagazineCatalog {
  version: 1;
  generatedAt: string;
  publications: Publication[];
}

interface Publication {
  code: "SU" | "MY";
  slug: "sudha" | "mayura";
  title: string;
  editions: EditionSummary[];
}

interface EditionSummary {
  key: string;                   // "SU-2026-09-24"
  publication: "SU" | "MY";
  date: string;                  // ISO date
  label: string;
  coverUrl: string;
  pageCount: number;
  articleCount: number;
  hasArticles: boolean;
}
```

### Generated edition manifest

`generated/editions/{EDITION_KEY}.json`:

```ts
interface EditionManifest {
  version: 1;
  key: string;
  publication: "SU" | "MY";
  date: string;
  title: string;
  coverUrl: string;
  pages: PageRecord[];
  articles: Record<string, ArticleRecord>;
  articleOrder: string[];
  sections: SectionRecord[];
}

interface PageRecord {
  index: number;                 // Zero-based internally
  displayNumber: number;         // One-based for UI
  id: string;
  width: number;
  height: number;
  imageUrl: string;
  thumbnailUrl: string;
  articles: ArticleHotspot[];
}

interface ArticleHotspot {
  articleId: string;
  top: number;                   // Normalized 0–1
  left: number;
  width: number;
  height: number;
  area: number;
}

interface ArticleRecord {
  id: string;
  title: string;
  byline?: string;
  section?: string;
  pageIndexes: number[];
  primaryPageIndex: number;
  htmlUrl: string;
  plainText: string;
  imageUrls: string[];
  previousArticleId?: string;
  nextArticleId?: string;
}

interface SectionRecord {
  name: string;
  articleIds: string[];
}
```

### Normalization rules

The build script must:

1. Preserve the page order from `coords.json` or `index.json`.
2. Convert hotspot percentages into numbers between `0` and `1`.
3. Deduplicate articles appearing on multiple pages.
4. Read headline text from `.articleDetail h1 p` (the `h1` also contains a `<figure>` credit, so take the paragraph, not the whole heading).
5. Read the byline and section from `bylines.json`.
6. Fall back to values inside article HTML when bylines are missing.
7. Rewrite legacy article-image paths to local `media/` paths.
8. Remove scripts, inline event handlers, iframes and unwanted styles from article fragments.
9. Generate plain text for search and speech.
10. Determine previous and next article using first-page position and hotspot position.
11. Mark editions without usable article hotspots as page-only editions.
12. Report missing files without failing the entire catalog unless the edition cannot render.

### Validation output

The preparation script should print a concise report:

```text
SU-2026-09-24
✓ 64 pages
✓ 32 articles
✓ 32 article files
✓ All bylines resolved
✓ All page images found

MY-2026-09-01
✓ 164 pages
✓ 36 articles
⚠ 12 pages have no article hotspot (page-only)
✓ All thumbnails found
```

Fatal problems should return a non-zero exit code:

* No pages.
* Invalid JSON.
* Page record without a matching image.
* Duplicate page IDs that make ordering ambiguous.

---

## 6. Serving local content

Keep `data/` as the source of truth.

During development, configure Vite to mount:

```text
/data/...       → repository data/
/generated/...  → repository generated/
```

For a shareable prototype build, `package-prototype.ts` should copy only configured editions into `dist/data/`, rather than copying the entire 1.25 GB archive.

Example `prototype.config.json`:

```json
{
  "editions": [
    "SU-2026-09-24",
    "MY-2026-09-01"
  ]
}
```

This provides one standard Sudha issue and one long Mayura issue for testing.

---

## 7. URL and navigation model

Use one reader route:

```text
/{publication}/{date}/read/
```

State is represented through query parameters:

```text
/sudha/2026-09-24/read/?p=12
/sudha/2026-09-24/read/?p=12&view=text&article=1447919936
```

### URL rules

* `p` is a one-based page number.
* Missing or invalid `p` falls back to page 1.
* `view` is `page` or `text`.
* `article` is required when `view=text`.
* Invalid article IDs fall back to the source page.
* Page swiping uses `history.replaceState`, preventing hundreds of browser-history entries.
* Opening an article uses `history.pushState`.
* Browser Back from an article returns to its exact source page.
* Selecting another edition creates a new history entry.
* Closing a panel should not create history entries.

SEO-specific article routes can be added in V2 without changing the reader’s internal state model.

---

## 8. Application state

Use a reducer as the single source of truth:

```ts
interface ReaderState {
  editionKey: string;
  viewMode: "page" | "text";
  activePageIndex: number;
  activeArticleId: string | null;

  openPanel:
    | "contents"
    | "pages"
    | "saved"
    | "editions"
    | "search"
    | "more"
    | null;

  zoom: {
    scale: number;
    x: number;
    y: number;
  };

  speech: {
    status: "idle" | "playing" | "paused" | "unsupported";
    sentenceIndex: number;
    rate: number;
    voiceURI: string | null;
  };

  lastOpenedArticleByPage: Record<number, string>;
}
```

Important actions:

```text
LOAD_EDITION
GO_TO_PAGE
OPEN_ARTICLE
RETURN_TO_PAGE
OPEN_PANEL
CLOSE_PANEL
SET_ZOOM
RESET_ZOOM
START_SPEECH
PAUSE_SPEECH
STOP_SPEECH
RESTORE_SESSION
```

Changing edition or page must reset zoom and stop speech.

---

## 9. App shell implementation

### Header

Use one `AppHeader` component.

#### Page mode

Show:

* Publication switcher.
* Current-edition chip.
* Search action.
* More action.

#### Text mode

Show:

* Back to source page.
* Truncated article title.
* Save action.
* More action.
* Byline, section and source page.
* Text-size controls.
* Reading-progress bar.

Do not create separate page and article headers. The same header container changes its content using `viewMode`.

### Context navigation

Use one semantic `<nav>` element.

Page mode configuration:

```text
Contents | Pages | Saved
```

Text mode configuration:

```text
Contents | Listen | Saved
```

At desktop breakpoints, CSS repositions the same navigation element into the left rail.

### Panel host

Use one `PanelHost`. It displays the selected panel content:

```text
ContentsPanel
PagesPanel
SavedPanel
EditionPanel
SearchPanel
```

On mobile it behaves as a bottom sheet. On desktop it becomes a side panel. It must not render separate mobile and desktop versions.

Panel behaviour:

* Trap keyboard focus while modal on mobile.
* Escape closes the panel.
* Return focus to the triggering control.
* Background content becomes inert while the mobile sheet is open.
* Desktop persistent panels do not make the reader inert.

---

## 10. Page reader implementation

### Page strip

Render one slide container for every page, but load actual page images only around the current page.

This preserves correct scroll positions without decoding 164 images.

```text
Active page: image loaded eagerly
Page ±1: preloaded
Page ±2: lazy candidate
All others: aspect-ratio placeholder
```

The strip uses:

```css
overflow-x: auto;
display: flex;
scroll-snap-type: x mandatory;
overscroll-behavior-inline: contain;
```

Each page uses:

```css
scroll-snap-align: center;
flex: 0 0 80vw;
```

Use an `IntersectionObserver` rooted to the strip. The visible page is the slide with the greatest intersection ratio.

Use `scrollend` where available and a debounced scroll fallback elsewhere. Only persist the final settled page.

### Mobile sizing

The reader must account for:

* Header.
* Bottom navigation.
* Page controls.
* Safe-area insets.
* Mode toggle.
* Available viewport height.

Use `100dvh`, not `100vh`.

The page image uses `object-fit: contain` and must never force horizontal page-level scrolling.

### Desktop sizing

At `min-width: 1024px`:

* Move navigation to the left rail.
* Show approximately two pages.
* Calculate each page width from the available reader area, not from the full viewport.
* Retain the same horizontal strip and page components.
* Keep arrow keys and previous/next buttons working page-by-page.

Do not create a separate spread renderer for the prototype.

### Page changes

All page-change methods dispatch the same `GO_TO_PAGE` action:

* Native swipe/scroll.
* Previous/next button.
* Edge tap.
* Keyboard arrow.
* Contents selection.
* Pages-grid selection.
* Resume action.

`GO_TO_PAGE` must:

1. Clamp the target page.
2. Stop speech.
3. Reset zoom.
4. Scroll the target slide into view.
5. Update the URL.
6. Save the resume position.

### Keyboard controls

When focus is not inside a form control or panel:

* `ArrowLeft`: previous page.
* `ArrowRight`: next page.
* `Home`: first page.
* `End`: last page.
* `+`: zoom in.
* `-`: zoom out.
* `0`: reset zoom.
* `Escape`: close panel or reset zoom.

Respect `prefers-reduced-motion`; use instant rather than smooth scrolling when requested.

---

## 11. Article hotspots

Place a hotspot layer directly over the page image.

The overlay must have the exact same aspect ratio and rendered bounds as the image. Each hotspot is an absolutely positioned button:

```css
top: percentage;
left: percentage;
width: percentage;
height: percentage;
```

### Hotspot behaviour

* Transparent at rest.
* Subtle highlight on hover.
* Strong visible outline on keyboard focus.
* Accessible label: `Read: {article title}`.
* Tap opens the matching article.
* Pointer movement over a small threshold cancels the tap, preventing accidental article opens during page swipes.

If multiple hotspots point to the same article, they all open the same article record.

The page-to-text toggle selects articles in this order:

1. Article most recently opened explicitly on this page.
2. Largest article hotspot on the page.
3. First hotspot in reading order.

Hide the toggle completely when a page has no article hotspots.

A one-time hint can briefly reveal hotspots the first time the reader enters an article-capable page.

---

## 12. Mode toggle

Use one `ModeToggle` component.

Mobile position:

* Fixed above the bottom navigation.
* Bottom-right with safe-area spacing.
* Minimum 44px targets.

Desktop position:

* Reposition into the header using CSS.
* Do not mount a second copy.

Behaviour:

* Page → Text opens the selected primary article.
* Text → Page returns to the source page.
* Opening text pushes browser history.
* Returning through the toggle or Back restores the exact page position.
* The toggle remains in the same visual location throughout each responsive layout.

---

## 13. Article view

### Rendering

Load normalized article content only when the article is opened.

Structure:

```text
Article header
Headline
Byline and section
Article images/captions
Article body
Previous/next article footer
Mode toggle
Context navigation
```

Do not inject the raw upstream fragment directly. Render the sanitized normalized content.

### Text size

Expose three or four predefined steps:

```text
Small
Default
Large
Extra large
```

Store the selected step globally in local storage.

Use CSS custom properties:

```css
--article-font-size
--article-line-height
--article-measure
```

Do not allow arbitrary inline font sizing.

### Reading progress

Calculate progress using the article scroll container:

```text
scrollTop / (scrollHeight - clientHeight)
```

Update through `requestAnimationFrame`, not on every raw scroll event.

### Previous and next article

Use `previousArticleId` and `nextArticleId` from the edition manifest.

Selecting one:

* Opens the new article.
* Moves the source page to that article’s primary page.
* Resets article scroll to the top.
* Updates the URL.
* Stops current speech.

---

## 14. Contents panel

Build the contents list from normalized articles.

Group by section when section metadata is usable. Put missing-section articles under a neutral “Other” group.

Each row contains:

* Headline.
* Byline when available.
* Page number.
* Saved indicator when bookmarked.

Selecting an article:

1. Sets the source page.
2. Closes the panel.
3. Opens text view.
4. Scrolls the corresponding page into position behind the article state.

For a page-only edition, Contents falls back to a numbered page list.

---

## 15. Pages panel

Render all page containers but lazy-load thumbnail images.

Each thumbnail includes:

* Page image.
* Page number.
* Current-page highlight.
* Accessible label.
* Article indicator when the page has readable text.

For issues with more than approximately 80 pages, include the scrub slider.

Slider requirements:

* Range `1...pageCount`.
* Preview the target page number while dragging.
* Navigate only on release, avoiding repeated full reader updates.
* Keep the current thumbnail scrolled into view when the panel opens.

---

## 16. Edition selector

Read editions from `catalog.json`.

Layout:

* Publication tabs: Sudha and Mayura.
* Cover grid.
* Edition label/date.
* Current-edition marker.
* Page-only marker for editions without article data.

When switching editions:

1. Store the current edition’s resume state.
2. Load the selected manifest.
3. Restore its saved page, falling back to page 1.
4. Close all panels.
5. Stop speech.
6. Reset zoom.
7. Update the URL.

---

## 17. Saved and resume storage

Use one versioned local-storage record:

```ts
interface ReaderStorageV1 {
  version: 1;
  preferences: {
    articleTextSize: number;
    theme: "system" | "light" | "dark" | "sepia";
    speechRate: number;
    voiceURI?: string;
  };
  editions: Record<string, {
    lastPageIndex: number;
    lastArticleId?: string;
    updatedAt: string;
    bookmarks: Bookmark[];
  }>;
}

interface Bookmark {
  type: "page" | "article";
  id: string;
  pageIndex: number;
  createdAt: string;
}
```

Storage rules:

* Save settled page changes, not every scroll event.
* Catch parse and quota errors.
* Ignore unknown future fields.
* If storage is corrupt, reset safely without breaking the reader.
* Validate that restored pages and articles still exist.

---

## 18. Search

Search only within the active edition for the prototype.

The normalized edition manifest contains:

* Title.
* Byline.
* Section.
* Plain article text.
* Source page.

Load the search index only when Search is opened.

Ranking:

1. Exact title match.
2. Title prefix.
3. Title contains.
4. Byline match.
5. Section match.
6. Body-text match.

Search results display:

* Headline.
* Byline/section.
* Page number.
* Short matching excerpt.

Use Unicode normalization before matching. Do not aggressively stem Kannada text.

Selecting a result opens the article in text view.

---

## 19. Listen implementation

Treat Listen as prototype polish and build it after the reader is stable.

Use `window.speechSynthesis`.

### Voice selection

1. Load voices after `voiceschanged`.
2. Prefer voices whose language begins with `kn`.
3. Allow the user to select another installed voice.
4. If there is no Kannada voice, display a clear unsupported message.

### Sentence highlighting

Do not depend entirely on speech boundary events because browser support is inconsistent.

Instead:

1. Divide article text into sentences using `Intl.Segmenter("kn", { granularity: "sentence" })`.
2. Use a fallback sentence splitter when unavailable.
3. Create one utterance per sentence.
4. Highlight the sentence when its utterance begins.
5. Queue the next sentence when it ends.

Leaving text view, changing article or changing edition must call:

```ts
speechSynthesis.cancel();
```

Controls:

* Play/pause.
* Stop.
* Rate: 0.75×, 1×, 1.25×, 1.5×.
* Voice picker.
* Current sentence indicator.

---

## 20. Zoom implementation

Build zoom after normal page navigation and hotspots are stable.

`ZoomSurface` owns:

* Active pointers.
* Scale.
* Translation.
* Pinch midpoint.
* Pan origin.

Rules:

* Minimum scale: `1`.
* Maximum scale: `4`.
* Double tap: toggle between `1` and `2`.
* Zoom remains anchored to the pointer midpoint.
* At scale greater than `1`, freeze page-strip scrolling.
* One-finger movement pans the zoomed page.
* Constrain translation so the image cannot be lost completely off-screen.
* Reset zoom on every page change.
* Edge taps and arrows are disabled while zoomed.
* Show a reset control whenever scale exceeds `1`.

Keep browser-level accessibility zoom enabled. Never use `user-scalable=no`.

If custom touch handling proves unstable, retain visible `+`, `−` and Reset controls for the prototype rather than delaying the entire reader.

---

## 21. Styling architecture

Use a single `src/styles/app.css` file organized into cascade layers:

```css
@layer reset, tokens, base, layout, components, states, utilities;
```

Define tokens once:

```css
:root {
  --brand-sudha: #6a1b9a;
  --brand-mayura: #00695c;

  --header-height: 56px;
  --bottom-nav-height: 64px;
  --content-max-width: 1200px;

  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-6: 24px;

  --radius-small: 6px;
  --radius-medium: 12px;
  --focus-ring: 0 0 0 3px;
}
```

Breakpoints must use only `min-width`:

```css
@media (min-width: 480px) {}
@media (min-width: 768px) {}
@media (min-width: 1024px) {}
@media (min-width: 1280px) {}
```

Do not add device-specific component versions, override stylesheets or `!important`.

---

## 22. Accessibility requirements

The prototype is not complete unless:

* All controls are reachable by keyboard.
* Touch targets are at least 44×44px.
* Icon-only controls have accessible names.
* Hotspots announce article titles.
* Current page uses `aria-current`.
* Page changes are announced through a polite live region.
* Sheets trap and restore focus correctly.
* Focus indicators are always visible.
* Text contrast is at least 4.5:1.
* Reduced-motion preferences are respected.
* Article structure uses real headings, paragraphs, figures and captions.
* Keyboard page navigation is disabled while typing in Search.
* Screen readers are not exposed to unloaded placeholder images.

---

## 23. Performance requirements

For long Mayura issues:

* Never decode all page images.
* Keep full-size images mounted only for the active page and nearby pages.
* Set explicit page aspect ratios before images load.
* Use `loading="lazy"` for thumbnails and inactive article images.
* Use `fetchpriority="high"` only for the initial page.
* Load edition manifests before page assets.
* Load search data only when needed.
* Load article HTML only when an article is opened.
* Remove or clear distant full-page images so decoded bitmaps can be released.
* Avoid Base64-encoded assets.
* Do not preload the complete issue PDF.

Performance testing should use the 164-page Mayura edition, not only a shorter Sudha edition.

---

## 24. Error and fallback states

Implement visible handling for:

* Edition manifest cannot load.
* Page image is missing.
* Thumbnail is missing.
* Article file is missing.
* Article contains no body.
* `bylines.json` is unavailable.
* Edition contains no hotspots.
* Search index cannot load.
* Local storage is unavailable.
* Speech synthesis has no Kannada voice.

A missing article must not make its source page inaccessible.

---

## 25. Testing plan

### Unit tests

Test:

* Hotspot percentage parsing.
* Article deduplication.
* Primary-article selection.
* Page clamping.
* URL parsing and serialization.
* Previous/next article ordering.
* Search ranking.
* Local-storage migration and corruption handling.
* Legacy article-image path rewriting.
* Missing-byline fallback.

### Component tests

Test:

* Contextual header changes.
* Contextual navigation changes.
* Mode toggle visibility.
* Disabled previous/next states.
* Panel opening and focus restoration.
* Text-size preferences.
* Page-only edition fallback.

### Playwright scenarios

At minimum:

1. Open Sudha on page 1.
2. Swipe to page 2.
3. Navigate with next/previous controls.
4. Open an article hotspot.
5. Return to the source page.
6. Open Contents and select another article.
7. Use the Pages grid to jump to page 50.
8. Switch from Sudha to Mayura.
9. Reload and verify resume position.
10. Navigate entirely with the keyboard.
11. Open a page-only edition.
12. Verify there is no horizontal document overflow.

Run each core flow at:

* `360 × 800`
* `390 × 844`
* `768 × 1024`
* `1366 × 768`
* `1440 × 900`

---

## 26. Implementation milestones

### Milestone 0: Data foundation

* Create Vite/React/TypeScript project.
* Implement content types.
* Implement content-index generation.
* Validate one Sudha and one Mayura edition.
* Mount local data in development.

Done when both manifests load and all referenced pages can be opened.

### Milestone 1: Application shell

* Header.
* Context navigation.
* Panel host.
* Publication styling.
* Router and URL state.
* Reader reducer.

Done when route, publication, edition and view state survive reload.

### Milestone 2: Page reader

* Page strip.
* Snap behaviour.
* Active-page detection.
* Previous/next controls.
* Indicator.
* Keyboard navigation.
* Image windowing and preload.
* Resume storage.

Done when the 164-page Mayura issue remains responsive without loading every full page.

### Milestone 3: Article experience

* Hotspot overlay.
* Article parser/rendering.
* Page/text toggle.
* Article header.
* Text sizing.
* Reading progress.
* Previous/next article.
* Back-to-source-page behaviour.

Done when an article can be entered through a hotspot and exited to the exact page.

### Milestone 4: Discovery panels

* Contents.
* Pages grid.
* Scrubber.
* Edition selector.
* Page-only issue fallback.

Done when any page or article can be reached without sequential swiping.

### Milestone 5: Saved and search

* Bookmarks.
* Saved panel.
* In-edition search.
* Search excerpts and ranking.

Done when state survives reload and search navigates to the correct article.

### Milestone 6: Prototype polish

* Zoom.
* Listen.
* Share.
* Themes.
* Article-image zoom.
* Desktop persistent panels.

These should not block user testing of the core prototype.

### Milestone 7: QA

* Accessibility pass.
* Responsive pass.
* Performance pass.
* Error-state testing.
* Real-device testing.
* Kannada content review.

---

## 27. Prototype definition of done

The prototype is ready for user testing when:

* Both Sudha and Mayura can be selected.
* At least one 60-page and one 160-page issue work.
* Page swiping is smooth on a normal mobile device.
* Only nearby full-page images are decoded.
* Contents and Pages provide reliable non-linear navigation.
* Article hotspots open the correct text.
* Page-to-text and text-to-page transitions preserve context.
* Reload restores the current edition and page.
* Mobile has no document-level horizontal overflow.
* Desktop displays the same application without separate components.
* Keyboard navigation and visible focus work.
* Missing article metadata does not break the reader.
* Core flows pass at 360px and 1366px.

This structure makes the prototype straightforward to implement while leaving clean replacement points for authentication, entitlements, production APIs and SEO in V2.
