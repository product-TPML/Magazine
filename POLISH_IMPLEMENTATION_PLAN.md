# Reader polish implementation plan

## Objective

Bring the current Sudha/Mayura reader into closer agreement with `PLAN.md` while keeping the printed magazine as the home experience, preserving the existing single DOM across breakpoints, and avoiding unnecessary dependencies.

This document is an implementation plan only. No application code is changed in this planning lane.

## Current implementation boundary

The first implementation pass is **visual and interaction polish only**. It may change spacing, icon presentation, drawer styling, image gesture handling, loading presentation, and other presentation details without changing the reader's content, account, entitlement, routing, or persistence behavior.

The entitlement model and 100-word paid preview described below are a future proposal. They require explicit user approval before any implementation. If a proposed polish fix would alter functionality, stop and ask for approval rather than silently including it.

## Product decisions

- Keep the page reader as the default home state.
- Use one combined publication/edition control in the page header.
- Keep Contents and Pages as overlays using the existing panel infrastructure.
- Keep the hamburger as a right-side drawer on mobile and desktop.
- Treat entitlement as explicit reader state rather than inferring it from article length.
- Subscribers see complete article content and no Free/Premium labels.
- Free users see complete free articles. Paid articles show a 100-word preview followed by a clear Subscribe CTA.
- Use inline SVG symbols for reader controls instead of Unicode arrows, stars, grids, and menu characters.
- Keep article images in the reading column, with native touch scrolling/panning and pinch zoom that does not move the article shell.

## Scope and file ownership

### `index.html` — structural owner

- Consolidate the page publication/date controls into one button while retaining the same DOM for all viewport sizes.
- Keep the article header controls in the order: Back to page, Bookmark, Subscribe/Renew, Menu.
- Add a reusable inline SVG icon sprite or local inline SVG definitions for menu, close, back, bookmark, contents, pages, search, profile, saved, FAQ, share, listen, and navigation controls.
- Add accessible labels and live/status regions needed by drawer, entitlement CTA, speech, and preview messaging.
- Keep existing modal/panel hosts where possible instead of introducing parallel navigation markup.

### `app.js` — behavior, state, and data owner

- Introduce explicit account/entitlement state for the prototype.
- Update header, drawer, article, page, and overlay rendering to consume that state.
- Preserve URL state, resume behavior, focus return, and existing issue-loading flow.
- Centralize icon rendering through one small helper or sprite reference rather than repeating SVG markup.
- Keep article sanitization and local data loading intact unless a change is needed for entitlement rendering or image behavior.

### `styles.css` — visual and responsive owner

- Adjust the original selectors in place; do not add a separate mobile or desktop stylesheet.
- Establish spacing variables for header, bottom navigation, safe areas, drawer, and reading content.
- Define SVG sizing/alignment and consistent interactive states.
- Refine drawer, bottom navigation, article preview/CTA, and image interaction styles at the existing breakpoints.
- Preserve `prefers-reduced-motion`, focus visibility, contrast, and 44px minimum targets.

### `POLISH_IMPLEMENTATION_PLAN.md` — planning owner

- This file records the implementation sequence, acceptance criteria, risks, and verification matrix.

## Implementation sequence

### 1. Baseline and shared tokens

1. Confirm the current issue URL loads and record baseline screenshots at 360px and 1280px.
2. Keep the existing custom Prajavani fonts and theme variables.
3. Add only the spacing and interaction tokens needed to remove accumulated magic numbers:
   - header height
   - bottom navigation height
   - drawer width
   - page/article safe-area padding
   - minimum interactive size
   - article column width
4. Ensure header, content, and bottom controls reserve space consistently so no content is hidden beneath fixed UI.

### 2. Header and bottom-navigation spacing

1. Replace the separate publication and edition buttons with one compact, keyboard-accessible control showing publication plus a shortened date on narrow screens and the full issue label at larger widths.
2. Maintain the required order: combined edition control, Subscribe/Renew when applicable, hamburger.
3. Prevent flex compression from producing clipped labels or undersized touch targets.
4. Keep the page and article bottom navigation fixed, but calculate article/page bottom padding from the same bottom-navigation variable plus safe-area inset.
5. Ensure the article listen player stacks above the article controls without covering the last paragraph or footer.
6. When the article action is absent, use a two-column page-control layout rather than leaving a blank third slot.
7. Preserve the existing hide/reveal behavior: page chrome toggles together; article chrome hides on downward scroll and returns on upward scroll, near top/bottom, tap, or focus.

### 3. Consistent inline SVG icon system

1. Replace text glyphs such as `☰`, `×`, `←`, `▶`, `☆`, `☷`, and `▦` with a small set of inline SVG icons.
2. Use a consistent viewBox, stroke width, line cap, and visual weight.
3. Put accessible names on the buttons; SVGs remain `aria-hidden="true"` and are not the only source of meaning.
4. Use CSS `currentColor` so icons follow theme, hover, disabled, and focus states.
5. Retain visible text labels for bottom actions and drawer rows where the contract calls for them.
6. Check that icons remain legible at 360px and do not change button dimensions when fonts load.

### 4. Hamburger drawer redesign

1. Retain the existing panel host and focus-trap approach; redesign its content rather than creating a second menu.
2. Use a full-height right drawer with:
   - compact header and close icon
   - Prajavani Home and Search as the top action pair
   - divider
   - Profile/Sign In
   - Saved Articles
   - FAQs
3. Remove duplicate edition/publication switching and duplicate subscription actions from the drawer.
4. Give every row a consistent icon, label, optional supporting text, and 44px minimum target.
5. On mobile, use nearly the full viewport width while preserving a visible backdrop and safe-area padding. On desktop, constrain the drawer width.
6. Keep the underlying page inert while open, restore focus to the trigger on close, close on Escape, and close on backdrop click.
7. Ensure opening Search from the drawer preserves the current issue and provides a clearly labelled search field with visible results state.

### 5. Entitlement and article access model

#### State model

Add a small explicit account state, for example:

```text
account = {
  status: "free" | "subscriber",
  name: optional string,
  subscriptionLabel: optional string
}
```

The prototype may persist this locally for exercising both states, but the default should remain deterministic. Do not infer entitlement from UI visibility.

#### Article metadata

- Keep an article’s source access classification in normalized issue data.
- If source data has no access field, retain the current fallback only as a data-normalization fallback, not as the public entitlement model.
- Avoid mutating article source text when generating a preview.

#### Rendering rules

- Subscriber:
  - render complete article
  - hide Free/Premium status labels and access composition labels
  - retain normal article navigation and controls
- Free user + free article:
  - render complete article
  - hide Free/Premium status labels if the label is not needed for the user decision
- Free user + paid article:
  - render headline, byline, lead image/description when permitted by product policy
  - render exactly the first 100 words of body text, without breaking markup into unsafe HTML
  - show a visually distinct Subscribe CTA after the preview
  - prevent access to the remainder of the paid body
  - keep page/Contents metadata useful, but do not misrepresent a preview as full access

The 100-word preview should be created from sanitized text/content nodes, preserve paragraph boundaries where practical, and avoid cutting inside a link, image, table, or unsafe element. Add a short “Subscribe to continue” message adjacent to the CTA.

#### CTA behavior

- Subscribe opens the existing profile/subscription surface for the prototype.
- Active subscribers do not see the Subscribe CTA or Free/Premium tags.
- Expired subscribers use Renew rather than Subscribe when that state is later connected.
- Entitlement changes must rerender the current article without losing its source page or scroll position where possible.

### 6. Article image interaction

1. Keep article images inside the centred reading column and constrain them to the column width by default.
2. Make image interaction touch-safe:
   - one-finger vertical movement scrolls the article when not zoomed
   - pinch changes image scale only
   - one-finger movement while zoomed pans the image
   - page/article scrolling must not accidentally activate an image or open a lightbox
3. Use pointer capture only for the active image gesture and release it on cancel/up.
4. Clamp zoom and reset it when changing images or leaving the article.
5. Keep captions immediately below images and preserve keyboard activation for focused images.
6. If the lightbox remains, ensure its image can be touch-scrolled/panned without the background article moving and that it has a clear close action, focus trap, Escape support, and reduced-motion behavior.
7. Avoid applying `touch-action: none` to the whole article image area when native article scrolling is needed; scope it to the active zoom surface.

### 7. Article layout and finish

1. Render article content in the contract order: access state when needed, headline, description, byline, lead image/caption, body, and non-sticky previous/next navigation.
2. Preserve the “View original page” action between previous and next article navigation.
3. Scope font-size controls to body text only, with four persisted levels and clamped values.
4. Keep the Kannada body near 18px at the smallest level with approximately 1.65–1.75 line height.
5. Avoid removing legitimate article paragraphs simply because they contain italic markup; only remove known extraction artifacts.
6. Ensure the article footer has enough bottom padding above fixed controls and remains reachable by keyboard.
7. Refine loading, unavailable, empty, and no-search-result states so each has a clear status message.

### 8. Page view and navigation finish

1. Display `Page X / N` on mobile and `Pages X–Y / N` on desktop spreads.
2. Keep cover alone, then pair 2–3, 4–5, and so on; show an unpaired final page alone.
3. Apply zoom to the intended page interaction surface rather than transforming the whole spread unintentionally.
4. Always show Reset Zoom while zoomed, including on pages with no article hotspots.
5. Keep hotspot activation disabled above 1× and ensure a gesture that moves beyond the tap threshold cannot open an article.
6. Preserve lazy image loading and only eagerly load the active page plus the immediate adjacent page.

## Accessibility requirements

- Use semantic buttons, links, headings, navigation, dialog roles, and labelled regions.
- Provide meaningful accessible names for all icon-only controls.
- Keep focus-visible outlines with contrast against both themes.
- Trap focus in the drawer and lightbox; restore focus to the invoking control on close.
- Mark background content inert while overlays are open.
- Announce issue changes, search result changes, entitlement state, and speech state through restrained live regions.
- Do not rely on color alone for paid/free state or current-page state.
- Preserve browser text/accessibility zoom and keyboard operation.
- Keep all controls at least 44px by 44px and ensure drawer rows are reachable without precision tapping.
- Respect `prefers-reduced-motion` for page transitions, drawer transitions, image/lightbox transitions, and speech auto-scroll.
- Verify Kannada text has adequate contrast in sepia and dark themes.

## Responsive behavior

- Base layout targets 360–390px first.
- Use the same markup and components at all sizes.
- At 360px: compact combined edition control, nearly full-width drawer, single magazine page, one-column article, bottom controls with safe-area padding.
- At 480px: allow modestly wider gutters and page grids.
- At 768px: increase usable page canvas and drawer/content space without changing information architecture.
- At 1024px and above: enable two-page spread, desktop page arrows and zoom controls, and constrained drawer width.
- At 1280px: preserve generous outer spacing while allowing the magazine to dominate; do not add a persistent navigation rail or desktop-only toolbar.
- Check for horizontal overflow at every target size, especially the header, drawer, article tables, preview CTA, and bottom controls.

## Dependencies

- No new dependency is required.
- Reuse the existing browser APIs: `localStorage`, Pointer Events, `SpeechSynthesis`, `navigator.share`, Clipboard API, inert, and native responsive CSS.
- Playwright MCP is required for the assigned browser verification.
- Existing issue manifests, article fragments, thumbnails, and media remain the content source.

## Acceptance criteria

### Header and navigation

- [ ] Publication and edition date are one control with correct narrow/wide labels.
- [ ] Header and bottom navigation never overlap content or unsafe areas.
- [ ] Page indicator includes current page and total count; spreads show a range.
- [ ] Controls hide/reveal according to `PLAN.md` without trapping focus or hiding focused controls.

### Drawer and icons

- [ ] Hamburger opens the same accessible right drawer at both target widths.
- [ ] Drawer contains only Prajavani Home, Search, Profile/Sign In, Saved Articles, and FAQs.
- [ ] All icons are consistent inline SVGs with accessible button names.
- [ ] Escape, backdrop, close button, focus trap, and focus restoration work.

### Entitlements

- [ ] Subscriber sees complete articles with no Free/Premium labels.
- [ ] Free user sees complete free articles.
- [ ] Free user sees exactly a 100-word paid preview plus Subscribe CTA and cannot see the remainder.
- [ ] Entitlement changes rerender safely and preserve article/source-page context.

### Article images and reading

- [ ] Article images preserve captions, scroll normally at 1×, pinch-zoom, and pan while zoomed.
- [ ] Image gestures do not scroll the wrong surface or trigger page/article navigation.
- [ ] Article footer retains previous, original-page, and next actions as applicable.
- [ ] Font controls affect article body only and persist locally.

### Quality

- [ ] No horizontal scroll at 360px or 1280px.
- [ ] Keyboard and screen-reader names are present for all controls.
- [ ] Reduced-motion mode remains usable.
- [ ] Page and below-fold article images remain lazy-loaded.

## Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Existing manifests do not expose reliable paid/free metadata | Normalize one explicit access field and document the fallback; do not present heuristic labels as authoritative entitlement. |
| Truncating extracted HTML at 100 words breaks markup or leaks paid content | Count sanitized text nodes, clone only complete safe nodes, and append the CTA outside the preview. Test nested Kannada markup and images. |
| Pointer handlers interfere with native article scrolling | Keep `touch-action` scoped, test one-finger scroll and two-finger pinch separately, and cancel click activation after movement. |
| Header controls become cramped at 360px | Use one combined edition control, ellipsis only non-critical labels, and verify computed target sizes. |
| SVG replacement reduces discoverability | Keep visible labels for labelled actions and use tooltips/accessible names only for icon-only controls. |
| Saved article IDs collide across editions | Store issue key and article ID together; preserve unavailable entries rather than silently dropping them. |
| Browser speech voices differ by machine | Treat Kannada voice availability as a capability, provide a clear disabled/status state, and do not block article reading. |
| Fixed players or controls cover content | Derive padding from shared variables and verify the final paragraph/footer at both viewport sizes. |

## Minimal test matrix

| Area | 360px | 1280px | Keyboard/screen reader | Reduced motion |
| --- | :---: | :---: | :---: | :---: |
| Initial issue load and resume | ✓ | ✓ | ✓ | ✓ |
| Header spacing and combined edition control | ✓ | ✓ | ✓ | — |
| Page swipe, arrows, page indicator | ✓ | ✓ | ✓ | ✓ |
| Pinch zoom/reset and hotspot suppression | ✓ | ✓ | — | ✓ |
| Contents and Pages overlays | ✓ | ✓ | ✓ | ✓ |
| Hamburger drawer and focus handling | ✓ | ✓ | ✓ | ✓ |
| Search and article selection | ✓ | ✓ | ✓ | — |
| Free article rendering | ✓ | ✓ | ✓ | — |
| Paid 100-word preview and Subscribe CTA | ✓ | ✓ | ✓ | — |
| Subscriber full article/no access tags | ✓ | ✓ | ✓ | — |
| Article image scroll/pinch/pan/lightbox | ✓ | ✓ | ✓ | ✓ |
| Bookmark, saved articles, share fallback | ✓ | ✓ | ✓ | — |
| Font controls, Listen, article footer | ✓ | ✓ | ✓ | ✓ |
| Horizontal overflow and fixed-control coverage | ✓ | ✓ | — | — |

## Playwright verification sequence

For each target viewport, load:

`http://localhost:8000/index.html?issue=SU-2026-09-24`

1. Confirm the issue, cover/page image, header, and bottom controls render.
2. Record a screenshot at 360px and 1280px.
3. Exercise page navigation with swipe/pointer input and keyboard arrows where applicable.
4. Open and close the hamburger; verify drawer width, ordering, backdrop, Escape, focus return, and no horizontal overflow.
5. Open Contents, select an article, return to the source page, then open Pages and select a page.
6. Open a multi-story page and verify the stories sheet ordering.
7. Open an article from a hotspot or Contents and verify header, body order, image interaction, bottom controls, original-page return, and article navigation.
8. Exercise free and subscriber states, confirming the exact entitlement rules and absence/presence of labels and CTA.
9. Use browser accessibility inspection for names, roles, focus order, and focus visibility.
10. Check console errors, failed network requests, computed overflow, and the final article/footer position above fixed controls.
11. Repeat key interactions with `prefers-reduced-motion: reduce` enabled.

The orchestrator owns execution and final validation; implementation should not be considered complete until these checks pass at both required viewport sizes.
