# Finalised Sudha–Mayura Reader UI Plan

## 1. Product principles

The interface should prioritize three user jobs:

1. Browse the original magazine pages.
2. Open and comfortably read a story.
3. Quickly find another story, page or edition.

The magazine and article content must dominate the screen. Navigation should remain minimal and disappear when the user is actively browsing or reading.

The mobile and desktop products use the same components, controls and navigation. Desktop adds only the two-page spread.

---

# 2. Magazine page view

This is the product’s main home page. It does not have Back or Close controls.

## Header

\`\`\`text
ಸುಧಾ · 24 ಸೆಪ್ 2026 ▾       Subscribe       ☰
\`\`\`

### Publication and edition control

* Show the current publication and edition date as one control.
* Tapping it opens the edition selector.
* Use a shortened date on narrow screens.
* Do not show a separate publication logo, edition card or switcher.

### Subscribe CTA

| User state                   | CTA          |
| ---------------------------- | ------------ |
| Signed out                   | Subscribe    |
| Signed in but not subscribed | Subscribe    |
| Expired subscription         | Renew        |
| Active subscriber            | Hide the CTA |

The CTA should be compact and use the publication accent colour.

### Hamburger

* Always visible when the header is visible.
* Search is inside the hamburger.
* No separate Search icon.

---

## Magazine canvas

* The page occupies the maximum available width and height.
* Use a dark neutral background behind the magazine.
* Do not permanently show 20% of the next page.
* Keep approximately 8–12px outer spacing so the page does not touch the viewport edge.
* Preserve the page’s original aspect ratio.
* Centre smaller pages rather than stretching them.
* Use the actual magazine page image without decorative framing.

### Page navigation

At normal zoom:

* Swipe horizontally to change page.
* Keyboard Left/Right works on desktop.
* The page snaps cleanly into position.
* A one-time first-use hint can explain horizontal swiping.
* Do not permanently show previous and next arrows on mobile.
* Desktop may show subtle previous/next buttons when controls are visible.

---

## Article hotspots

The extracted article coordinates remain active over the page.

* Tapping an article hotspot opens that article.
* Pointer movement beyond the tap threshold cancels article opening.
* Swiping or panning must never accidentally open an article.
* At zoom above \`1×\`, disable direct hotspot activation.
* Users can still access stories through the bottom article action.

A tap outside a hotspot toggles the page controls.

---

## Pinch zoom

Support pinch-to-zoom only.

* No double-tap zoom.
* Range: \`1×–4×\`.
* Zoom only the page image and hotspot layer.
* Header, bottom controls and other interface elements remain at normal size.
* At \`1×\`, one-finger horizontal movement changes pages.
* Above \`1×\`, one-finger movement pans the current page.
* Page swiping is disabled while zoomed.
* Show Reset Zoom whenever scale is above \`1×\`.
* Changing pages resets zoom to \`1×\`.
* Native browser accessibility zoom must remain enabled.

---

## Bottom page controls

\`\`\`text
Contents             1 / 64             Read article
\`\`\`

These are the only persistent page actions.

### Contents

Opens the story list for the current edition.

### Page number

* Opens the Pages view.
* Shows the current position.
* On desktop two-page view, display a range such as \`2–3 / 64\`.

### Article action

| Current page      | Action                                |
| ----------------- | ------------------------------------- |
| One article       | Read article                          |
| Multiple articles | \`3 articles\`                        |
| No articles       | Hide the action                       |
| Zoomed            | Reset zoom may temporarily replace it |

If the page has multiple articles, selecting \`3 articles\` opens a bottom sheet listing the stories on that page.

---

# 3. Article reader view

The article reader is a separate reading state reached from a hotspot, Contents, Search or the page’s article action.

## Header

\`\`\`text
← ಪುಟ 40          Bookmark          Subscribe          ☰
\`\`\`

* Do not display the article title in the header.
* \`← ಪುಟ 40\` returns to the exact source page.
* Bookmark saves or removes the current article.
* Subscribe/Renew follows the same user-state rules as the page header.
* Hamburger uses the same component as the page view.
* A thin reading-progress line can appear below the header.

If Bookmark is not included in the prototype, remove both the icon and Saved Articles from the hamburger.

---

## Article layout

Display content in this order:

1. Free or Premium status, if needed.
2. Article headline.
3. Description or introduction, when available.
4. Byline.
5. Lead image and caption.
6. Article body.
7. Non-sticky previous/next navigation.

### Typography

* Kannada body text should begin around 18px.
* Line height should be approximately 1.65–1.75.
* Paragraphs need clear vertical separation.
* Keep the reading column narrow and centred.
* Do not place the article inside a card.
* Images use the full article-column width.
* Captions appear immediately below their images.

---

## Article bottom controls

\`\`\`text
ಅ−             ಅ+             Listen             Share
\`\`\`

These controls are article-specific and remain the same on mobile and desktop.

### Font decrease and increase

* Change article-body typography only.
* Use four predefined font-size levels.
* Clamp at the minimum and maximum.
* Remember the selection locally.
* Do not resize headers, navigation or other UI.

### Listen

* Starts Kannada text-to-speech.
* Changes to Pause while playing.
* After playback begins, show a compact player above the bottom controls.
* The player contains progress, speed and Stop.
* Leaving the article stops playback.

### Share

* Use native sharing on supported mobile devices.
* Fall back to Copy Link.
* Share the article URL, not the raw article content.

---

## End of article

Previous and next article controls are part of the article body and are never sticky.

\`\`\`text
← Previous article

View original page · Page 40

Next article →
\`\`\`

* Previous/next follow the story order in Contents.
* View Original Page returns to the page containing the article.
* At the first or last article, omit the unavailable direction.

---

# 4. Header and bottom-control visibility

## Article view

* Scrolling downward hides the header and bottom controls.
* Scrolling upward reveals them immediately.
* Tapping the article reveals them.
* Do not reveal them automatically after five seconds.
* Near the top of the article, keep the header visible.
* Opening the hamburger or Listen player keeps the controls visible.
* Controls remain visible while keyboard focus is inside them.

## Page view

Because the page view does not vertically scroll:

* Controls are visible when the issue first opens.
* Tapping outside a hotspot toggles the controls.
* Horizontal page navigation may hide them after the interaction.
* Pinching does not immediately hide them because Reset Zoom may be needed.
* Opening any sheet or menu forces the controls visible.

Header and bottom controls hide and reveal together.

---

# 5. Contents view

Contents is a flat list of stories. Do not group by section.

Order stories by:

1. Page order.
2. Vertical hotspot position.
3. Horizontal hotspot position.

Each row contains:

* Headline.
* Byline, when available.
* Page number.
* Free or Premium label.
* Saved indicator, when applicable.

Example:

\`\`\`text
ಟೀಚರ್
ಕಾವ್ಯಾ ಕಡಮೆ                    Page 40
Premium
\`\`\`

Selecting a story:

1. Records its source page.
2. Closes Contents.
3. Opens the article reader.
4. Makes Back return to the recorded page.

For editions without article data, Contents displays a page list instead.

---

# 6. Pages view

Display a thumbnail grid for the current edition.

Each page contains:

* Page thumbnail.
* Page number.
* Number of articles.
* Free/Premium composition.
* Current-page highlight.

Examples:

\`\`\`text
Page 12
3 articles
2 Free · 1 Premium
\`\`\`

\`\`\`text
Page 28
1 article
Premium
\`\`\`

\`\`\`text
Page 36
No articles
\`\`\`

For pages containing both access types, show the counts rather than labelling the entire page Free or Premium.

### Page scrubber

For long issues:

* Range is \`1...pageCount\`.
* Show the target page number while dragging.
* Navigate only when the user releases the scrubber.
* Scroll the selected thumbnail into view.

Selecting a thumbnail closes Pages and opens that page at \`1×\` zoom.

---

# 7. Stories-on-this-page sheet

When a page contains multiple articles, the bottom control displays the article count.

Selecting it opens a short bottom sheet containing:

* Headline.
* Byline.
* Free/Premium label.

Selecting a story opens the article reader.

The list follows the hotspot position on the page so its order visually matches the printed layout.

---

# 8. Search

Search is opened from the hamburger.

Search only within the current edition for the prototype.

Search across:

* Headline.
* Byline.
* Article text.

Results use the same row structure as Contents:

* Headline.
* Byline.
* Matching excerpt.
* Free/Premium label.
* Page number.

Selecting a result opens the article reader and records its source page.

---

# 9. Edition selector

Tapping the publication/date in the page header opens the edition selector.

It contains:

* Sudha and Mayura tabs.
* Edition cover grid.
* Date or issue label.
* Current-edition indicator.
* Resume information such as \`Continue from page 32\`.
* Page-only indicator for editions without articles.

Selecting an edition:

1. Saves the current reading position.
2. Loads the selected issue.
3. Restores its last page, if available.
4. Otherwise opens its cover.
5. Resets zoom.
6. Closes all open menus and sheets.

The publication switcher should not also appear in the hamburger.

---

# 10. Hamburger menu

Use the same right-side drawer pattern as the existing ePaper product.

## Desktop

* Opens from the right.
* Uses a constrained drawer width.

## Mobile

* Opens from the right.
* Occupies most or all of the screen width.
* Uses the same content and ordering as desktop.

## Menu structure

\`\`\`text
                                           ×

[ Prajavani Home ]                [ Search ]

------------------------------------------------

○  My Profile
▢  Saved Articles
?  FAQs
\`\`\`

### Prajavani Home

* Links directly to the Prajavani homepage.
* Opens in the same tab.
* Saves the current page/article before navigating away.
* Do not rely on browser history.

Recommended Kannada label:

**ಪ್ರಜಾವಾಣಿ ಮುಖ್ಯಪುಟಕ್ಕೆ**

### Search

Opens search for the current issue.

### My Profile

* Opens the user’s profile.
* Subscription status and account management belong inside Profile.
* When signed out, change the label to Sign In.

### Saved Articles

* Opens saved articles.
* Does not include saved pages unless page saving is explicitly added later.

### FAQs

* Opens frequently asked questions.
* Include contact/support information inside FAQs.
* Do not add a separate Get in Touch section.

## Explicitly excluded

* Home—the page view is already the product home.
* Download issue.
* Download current page.
* Reading settings.
* Choose edition.
* Publication switcher.
* Separate contact block.
* Duplicate Subscribe CTA.

---

# 11. Saved articles

Saving is available only for articles in the initial version.

* Bookmark icon appears in the article header.
* Saved state changes immediately.
* Saved Articles is accessible through the hamburger.
* Store saved article IDs locally for the prototype.
* Display headline, publication, edition date and page number.
* If an article is unavailable, keep the saved entry but show an unavailable state.

Page bookmarking is excluded.

---

# 12. Mobile and desktop behaviour

Use the same components, controls and information architecture at every size.

| Feature          | Mobile        | Desktop                |
| ---------------- | ------------- | ---------------------- |
| Header           | Same          | Same                   |
| Hamburger        | Right drawer  | Right drawer            |
| Page controls    | Bottom        | Bottom                 |
| Article controls | Bottom        | Bottom                 |
| Contents         | Overlay/sheet | Same overlay           |
| Pages            | Overlay/sheet | Same overlay           |
| Article layout   | Single column | Centred single column  |
| Magazine         | Single page   | Two-page spread        |
| Zoom             | Pinch         | Pinch/trackpad gesture |
| Keyboard arrows  | Optional      | Supported              |

Do not add:

* Desktop navigation rail.
* Persistent Contents sidebar.
* Desktop-only toolbar.
* Separate desktop markup.
* Separate desktop feature set.

---

# 13. Desktop two-page spread

Two-page mode is the only intentional desktop enhancement.

## Pairing

* Cover appears alone.
* Then pages 2–3.
* Then pages 4–5.
* Continue in issue order.
* An unpaired final page appears alone.

## Navigation

* One horizontal action moves to the next spread.
* Page indicator displays \`2–3 / 64\`.
* Selecting a page from Pages opens the spread containing it.
* Article hotspots remain mapped to their respective page.
* Pinch/trackpad zoom applies to the selected page, not both pages simultaneously.

Enable two-page mode only when both pages can render at a useful width. Use available reader width rather than device detection.

---

# 14. Resume behaviour

Save locally:

* Current publication.
* Current edition.
* Current page.
* Last-opened article.
* Article font size.
* Saved articles.

When reopening the product:

* Open the most recently used edition.
* Restore its page.
* Do not automatically reopen an article.
* Display a subtle \`Continue from page X\` message.

---

# 15. Final screen contracts

## Magazine page home

\`\`\`text
Header:
Publication + edition | Subscribe/Renew | Hamburger

Canvas:
Single page on mobile
Two-page spread on desktop
Pinch-to-zoom page only

Bottom:
Contents | Page number | Read article(s)
\`\`\`

## Article reader

\`\`\`text
Header:
Back to source page | Bookmark | Subscribe/Renew | Hamburger

Body:
Headline | Byline | Image | Article text

Bottom:
Font − | Font + | Listen/Pause | Share

Article footer:
Previous article | Original page | Next article
\`\`\`

## Hamburger

\`\`\`text
Top:
Prajavani Home | Search

List:
My Profile/Sign In
Saved Articles
FAQs
\`\`\`

This is the final mobile-first structure: the printed magazine remains the home experience, text view is optimized specifically for reading, and desktop uses the same product with only the two-page spread added.
