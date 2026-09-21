# Editorial dependencies

The reader UI depends on editorial metadata that is not reliably available in the extracted article HTML.

## Required editorial metadata

### Article image placement

Editorial must map every article image to its intended position in the article body. Images must not be distributed using a paragraph-count heuristic because that produces random placements.

Recommended fields:

```json
{
  "articleId": "1814875586",
  "images": [
    { "file": "138175769.jpg", "afterParagraph": 10 }
  ]
}
```

`afterParagraph` is zero-based within the article body. The reader inserts the image immediately after that paragraph and does not wrap text around it.

### Access level

Editorial should mark every article as `free` or `premium`.

Until that metadata exists, the prototype uses the fallback rule:

- Fewer than 200 words: Free
- 200 words or more: Premium

The editorial label must override the word-count fallback.

### Contents page mapping

Editorial must map every article to its printed page number and hotspot coordinates for the table of contents and page view.

Required fields:

```json
{
  "articleId": "1814875586",
  "pageNumber": 56,
  "coordinates": {
    "top": 12.4,
    "left": 8.1,
    "width": 42.5,
    "height": 18.7
  }
}
```

Coordinates are percentages of the original page image. `pageNumber` is one-based for display; internal page indexes may remain zero-based.

## Current prototype assumptions

- Article image positions use a paragraph-count heuristic.
- Access uses the 200-word threshold when no editorial label is present.
- Contents and hotspot data come from `coords.json` and issue manifests when available.

These assumptions should be removed once the editorial metadata is supplied.
