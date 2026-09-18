# Vartasetu Sudha e-magazine: API findings

Inspected URL:

```text
https://vartasetu-magazine.tpml.in/sudha/2026-09-24
```

The page is a client-rendered flipbook. Its data comes from four `/api/*` routes plus static JSON manifests, page images, and article HTML.

## Request sequence

Typical initial load order:

1. `/api/entitlement`
2. `/api/plans`
3. `/flip/SU/issues.json`
4. `/flip/SU/20260924/flipbook/index.json`
5. `/api/free?pub=su&date=2026-09-24`
6. `/api/flip/token?pub=su&date=2026-09-24`
7. `/flip/SU/20260924/flipbook/bylines.json`
8. `/flip/SU/20260924/flipbook/langs.json`
9. Page images and, when opened, article HTML.

The exact host for all paths below is:

```text
https://vartasetu-magazine.tpml.in
```

## API endpoints

### `GET /api/entitlement`

Reports the current account's access.

Anonymous/preview shape observed:

```json
{
  "subscribed": false,
  "titles": [],
  "termEnd": null,
  "ownedIssues": []
}
```

Signed-in shape observed:

```json
{
  "subscribed": true,
  "titles": ["su", "my"],
  "termEnd": "<ISO timestamp>",
  "ownedIssues": [],
  "uuid": "<account id>",
  "ssoSubject": "<SSO subject>",
  "phone": null,
  "email": "<account email>",
  "lastLogin": "<ISO timestamp>",
  "loginMethod": "google",
  "amr": ["fed"],
  "identities": [
    {
      "provider": "google",
      "verified": true,
      "linked_at": "<ISO timestamp>"
    }
  ],
  "gmConsent": null,
  "gmConsentAt": null
}
```

The report contains account information. Do not log or publish the full response.

### `GET /api/plans`

Returns pricing and feature configuration.

```json
{
  "source": "accesstype",
  "atEnabled": true,
  "updatedAt": "<ISO timestamp>",
  "regions": {
    "IN": {
      "sym": "₹",
      "code": "INR",
      "minor": 0,
      "annual": {"su": 599, "my": 399},
      "single": {"su": 25, "my": 45},
      "bundle": 799,
      "plans": {
        "annual": {"my": 7836, "su": 7835},
        "single": {"my": 7847, "su": 7846},
        "bundle": 7837
      }
    },
    "INTL": {
      "sym": "$",
      "code": "USD",
      "minor": 2,
      "annual": {"su": 19.99, "my": 13.99},
      "single": {"su": 1.99, "my": 2.99},
      "bundle": 29.99,
      "plans": {
        "annual": {"my": 7842, "su": 7841},
        "single": {"my": 7845, "su": 7844},
        "bundle": 7843
      }
    }
  }
}
```

The `plans` values appear to be payment-plan identifiers; the adjacent `annual`, `single`, and `bundle` values are displayed prices.

### `GET /flip/SU/issues.json`

Returns the publication and issue catalog.

```json
{
  "publications": [
    {
      "id": "su",
      "title": "Sudha",
      "cadence": "weekly",
      "accent": "#6a1b9a",
      "accent2": "#8e3fc0",
      "issues": [
        {
          "date": "2026-09-24",
          "label": "24 September 2026",
          "dir": "20260924/flipbook",
          "cover": "1754411",
          "coverThumb": "1754411.png",
          "coverImage": "cover.jpg",
          "contents": [
            {
              "title": "<article title>",
              "byline": "<byline>",
              "section": "<section>",
              "words": 1971
            }
          ]
        }
      ]
    }
  ]
}
```

The current issue's catalog entry contains five highlighted contents entries. The catalog also includes older issues.

### `GET /api/free?pub=su&date=2026-09-24`

Returns the IDs allowed in preview mode.

```json
{
  "ok": true,
  "ids": ["1472311017"]
}
```

The ID is an article ID. In preview mode the token response also reported six free pages and one free article.

### `GET /api/flip/token?pub=su&date=2026-09-24`

Creates the flipbook access token.

Preview shape:

```json
{
  "ok": true,
  "token": "<redacted JWT-like token>",
  "access": "preview",
  "exp": 1789739418599,
  "freePages": 6,
  "freeArticles": 1
}
```

Signed-in shape:

```json
{
  "ok": true,
  "token": "<redacted JWT-like token>",
  "access": "full",
  "exp": 1789739603619,
  "freePages": 0,
  "freeArticles": 0
}
```

The token encodes the publication, issue date, access level, and expiry. The client stores it in a `flip_token` cookie scoped to `/flip` with `Secure` and `SameSite=Strict`. The observed lifetime was approximately three hours. The main login session is separate, so the flip token should not be treated as a permanent login credential.

Do not expose or hard-code the actual token.

### Token refresh

There is no long-lived flip token. `flip_token` is server-signed with a fixed expiry of about three hours; it cannot be extended or made permanent.

A fresh token can be minted without a browser as long as the site session is valid. Verified 2026-09-18 with a plain HTTP client:

- `we_uid` + `we_idt` cookies (host `vartasetu-magazine.tpml.in`) are sufficient; `we_idt` expires in about 30 days.
- `GET /api/flip/token?pub=my&date=2026-09-01` returned `access: "full"` with `exp` about three hours ahead.
- The returned `token` value is used directly as the `flip_token` cookie value for `/flip` requests.

Pattern for scripts: when the token is missing/expired or a request returns `403`, call `/api/flip/token` again and retry. Visiting the site in a browser before `we_idt` expires refreshes the session (the SSO refresh token on `id-staging.tpml.in` lasts about 100 days), so periodic browser visits keep API access alive indefinitely without a fresh login.

### `GET /flip/SU/20260924/flipbook/bylines.json`

Returns article metadata keyed by article ID.

```json
{
  "1447919936": {
    "byline": "ಡಿ.ಜಿ. ಮಲ್ಲಿಕಾರ್ಜುನ",
    "section": "ಲೇಖನಗಳು"
  },
  "1472311017": {
    "byline": "ರಾಹುಲ ಬೆಳಗಲಿ",
    "section": "ಸ್ಥಿರ ಶೀರ್ಷಿಕೆಗಳು"
  }
}
```

### `GET /flip/SU/20260924/flipbook/langs.json`

Returns available article language codes.

```json
{
  "available": ["en", "hi"]
}
```

## Flipbook manifest

### `GET /flip/SU/20260924/flipbook/index.json`

Describes the issue pages and article hotspots.

```json
{
  "edition": "Sudha",
  "fullPdfFile": null,
  "id": -1,
  "product": "Sudha",
  "pubDate": 20260924,
  "sections": [
    {
      "id": "Main",
      "name": "Main",
      "files": ["Main/epaper.json"],
      "pages": [
        {
          "id": "1754411",
          "name": "Seite 1",
          "width": 699,
          "height": 983,
          "ads": [],
          "articles": [],
          "imgFile": "webepaper/photos/1754411.png",
          "imgThumbFile": "webepaper/photos/thumbs/1754411.png",
          "pdfFile": "webepaper/pdf/1754411.pdf"
        },
        {
          "id": "1754371",
          "name": "Seite 4",
          "width": 699,
          "height": 983,
          "ads": [],
          "articles": [
            {
              "contentElementId": "/dcx/atom/document/<document id>",
              "id": "1447919936",
              "htmlFile": "article/webepaper/html/1447919936.html",
              "top": "0.0%",
              "left": "0.0%",
              "width": "100.0%",
              "height": "92.98067%"
            }
          ],
          "imgFile": "webepaper/photos/1754371.png",
          "imgThumbFile": "webepaper/photos/thumbs/1754371.png",
          "pdfFile": "webepaper/pdf/1754371.pdf"
        }
      ]
    }
  ],
  "title": null,
  "tiles": false
}
```

The current issue contains 64 pages. Each page has dimensions, optional ad hotspots, optional article hotspots, a page image, a thumbnail image, and a PDF path. The application used the page image paths in the observed browser flow; it did not fetch the listed PDF files.

## Content and asset requests

### Page images

```text
GET /flip/SU/20260924/flipbook/pages/{pageId}.png
```

With preview access, only the free page images are loaded. With full access, the browser loaded all 64 page PNGs.

Thumbnails use:

```text
GET /flip/SU/20260924/flipbook/thumbs/{filename}
```

### Article HTML

When an article hotspot is opened:

```text
GET /flip/SU/20260924/flipbook/articles/{articleId}.html
```

Language variants are supported by the client as:

```text
/articles/{articleId}.{lang}.html
```

The client first tries the language-specific file, then falls back to `{articleId}.html`.

The response is an HTML fragment, not JSON. Its observed structure is:

```html
<div class="articleDetail">
  <h1><p>Article title</p></h1>
  <div class="pictures">
    <div class="picture">
      <img src="data/.../photo.jpg" />
      <div class="credit"><p>Credit</p></div>
      <div class="caption"><p>Caption</p></div>
    </div>
  </div>
  <p><i><p>Byline</p></i></p>
  <div class="bodytext"><p>Article text</p></div>
</div>
```

In the preview run, article HTML requests returned `403`. After signing in and receiving a full token, the same article requests returned `200`.

Article HTML embeds image paths under `data/.../webepaper/photos/`. The client rewrites those paths to the issue's `/pages/` asset base. These article photos are served only from the CDN mirror (the site host returns `403` for photo IDs that are not page IDs), e.g. `https://d3fe7ja3iahxpd.cloudfront.net/MY/20260901/flipbook/pages/962146251.jpg`.

## Authentication/access behavior

- Anonymous load: entitlement is false, token access is `preview`, and protected article requests return `403`.
- Signed-in load: entitlement is true, token access is `full`, all page images are available, and article HTML requests return `200`.
- The token is short-lived and issue-scoped. Reuse the existing authenticated browser context or cookie jar rather than hard-coding it.
- The page's JavaScript bundle contains exactly these `/api/*` routes: `/api/entitlement`, `/api/plans`, `/api/free`, and `/api/flip/token`.

## Non-data resources

The page also loads the application JavaScript bundle, CSS, fonts, favicon, and branding images. These are presentation/runtime resources rather than data APIs.

## Mayura issue: 1 September 2026

Inspected URL:

```text
https://vartasetu-magazine.tpml.in/mayura/2026-09-01
```

Mayura uses the same API contract as Sudha. The publication code is `my`, the flipbook directory is uppercase `MY`, and the issue date is `2026-09-01`.

### Mayura requests

```text
GET /api/entitlement
GET /api/plans
GET /flip/MY/issues.json
GET /flip/MY/20260901/flipbook/index.json
GET /api/free?pub=my&date=2026-09-01
GET /api/flip/token?pub=my&date=2026-09-01
GET /flip/MY/20260901/flipbook/bylines.json
GET /flip/MY/20260901/flipbook/langs.json
```

The account and pricing responses have the same shapes documented above. The signed-in Mayura token response was:

```json
{
  "ok": true,
  "token": "<redacted JWT-like token>",
  "access": "full",
  "exp": 1789739921838,
  "freePages": 0,
  "freeArticles": 0
}
```

The token value is intentionally omitted. It is short-lived and is stored in the same `/flip`-scoped `flip_token` cookie.

Mayura's preview endpoint returned:

```json
{
  "ok": true,
  "ids": ["1052539951"]
}
```

Its language response was also:

```json
{
  "available": ["en", "hi"]
}
```

### Mayura issue catalog entry

The `my` publication entry in `/flip/MY/issues.json` reported:

```json
{
  "id": "my",
  "title": "Mayura",
  "cadence": "monthly",
  "accent": "#00695c",
  "accent2": "#2e9384"
}
```

The issue entry was:

```json
{
  "date": "2026-09-01",
  "label": "September 2026",
  "dir": "20260901/flipbook",
  "cover": "1738057",
  "coverThumb": "1738057.png",
  "coverImage": "cover.jpg",
  "contents": [
    {
      "title": "<article title>",
      "byline": "<byline>",
      "section": "<section>",
      "words": 3818
    }
  ]
}
```

The five highlighted contents entries included titles such as `ಟೀಚರ್`, `ನನ್ನ ಪರಿಸರದ ಹೊರಗೆ`, `ಮಂ.ಸ್ಮ.ಸಾ.ಸೇ.ಸಂ`, `ಬೂರುಗದ ಮನೆ`, and `ಸುಮಾನಿ ಬಸವನ ಪರಾಕ್ರಮ`.

### Mayura flipbook manifest

`GET /flip/MY/20260901/flipbook/index.json` returned the same manifest structure as Sudha:

```json
{
  "edition": "Mayura Magazine",
  "fullPdfFile": null,
  "id": -1,
  "product": "Mayura",
  "pubDate": 20260901,
  "sections": [
    {
      "id": "Main",
      "name": "Main",
      "files": ["Main/epaper.json"],
      "pages": ["<page objects>"]
    }
  ],
  "title": null,
  "tiles": false
}
```

Observed Mayura manifest characteristics:

- One section: `Main`.
- 164 pages.
- Page dimensions: `480 x 680`.
- 36 unique article IDs.
- `tiles: false`.
- `fullPdfFile: null`.
- Page objects contain the same `id`, `name`, `width`, `height`, `ads`, `articles`, `imgFile`, `imgThumbFile`, and `pdfFile` fields as Sudha.
- Article hotspot objects contain `contentElementId`, `id`, `htmlFile`, `top`, `left`, `width`, and `height`.

Example page object:

```json
{
  "id": "1738059",
  "name": "Seite 3",
  "width": 480,
  "height": 680,
  "ads": [],
  "articles": [
    {
      "contentElementId": "/dcx/atom/document/<document id>",
      "id": "1212828887",
      "htmlFile": "article/webepaper/html/1212828887.html",
      "top": "10.588235%",
      "left": "0.0%",
      "width": "92.083336%",
      "height": "89.26471%"
    }
  ],
  "imgFile": "webepaper/photos/1738059.png",
  "imgThumbFile": "webepaper/photos/thumbs/1738059.png",
  "pdfFile": "webepaper/pdf/1738059.pdf"
}
```

The first page also contains an ad object on page 2:

```json
{
  "id": "ad509273",
  "imgFile": "webepaper/photos/ad509273.jpg",
  "top": "0.0%",
  "left": "0.0%",
  "width": "100.0%",
  "height": "100.0%"
}
```

### Mayura content assets

Page images use:

```text
GET /flip/MY/20260901/flipbook/pages/{pageId}.png
```

Thumbnails use:

```text
GET /flip/MY/20260901/flipbook/thumbs/{filename}
```

When an article is opened, the browser requests:

```text
GET /flip/MY/20260901/flipbook/articles/{articleId}.html
```

Observed article requests returned `200` with full access. For example, article `1212828887` returned an HTML fragment with the same `.articleDetail`, `h1`, `.pictures`, `.picture`, `.credit`, `.caption`, and `.bodytext` structure as Sudha.

The article response embedded image paths such as:

```text
data/pp3-20260901_52/webepaper/photos/1029037694.jpg
```

The client rewrote that image to:

```text
/flip/MY/20260901/flipbook/pages/1029037694.jpg
```

On the initial Mayura load, the browser loaded the first four page PNGs lazily. The manifest, rather than the initial network list, is the authoritative source for all 164 page URLs.

## Unauthenticated API verification

The Mayura endpoints were also called directly with a clean HTTP client, without browser cookies, login state, or an `Authorization` header.

### Responses that remain public

These returned `200` and the same data shapes/content as the signed-in browser session:

- `/api/plans`
- `/flip/MY/issues.json`
- `/flip/MY/20260901/flipbook/index.json`
- `/api/free?pub=my&date=2026-09-01`
- `/flip/MY/20260901/flipbook/bylines.json`
- `/flip/MY/20260901/flipbook/langs.json`

The unauthenticated Mayura free-content response was:

```json
{
  "ok": true,
  "ids": ["1052539951"]
}
```

### Responses that change based on authentication

`GET /api/entitlement` returned the anonymous shape:

```json
{
  "subscribed": false,
  "titles": [],
  "termEnd": null,
  "ownedIssues": []
}
```

`GET /api/flip/token?pub=my&date=2026-09-01` still returned `200`, but issued preview access:

```json
{
  "ok": true,
  "token": "<redacted preview token>",
  "access": "preview",
  "exp": "<future epoch milliseconds>",
  "freePages": 9,
  "freeArticles": 1
}
```

The signed-in response for the same endpoint had `access: "full"`, `freePages: 0`, and `freeArticles: 0`.

### Protected assets

Without the preview token cookie, these direct requests returned `403`:

```text
GET /flip/MY/20260901/flipbook/pages/1738057.png
GET /flip/MY/20260901/flipbook/pages/1738062.png
GET /flip/MY/20260901/flipbook/articles/1052539951.html
GET /flip/MY/20260901/flipbook/articles/1212828887.html
```

The browser obtains the preview token from `/api/flip/token`, stores it in `flip_token`, and then uses that cookie for allowed preview assets. A raw request without that cookie is rejected, including the nominally free article/page URLs.

---

## Web edition (front-end) surface

Verified 2026-09-18 with a signed-in session for `my` (Mayura) and `su` (Sudha). `su` uses the same routes and endpoints with the `/su` prefix.

### Web routes (server-rendered)

| Route | Purpose |
| --- | --- |
| `/my`, `/su` | Home: current-issue highlights, sections, issue thumbnails |
| `/{pub}/section/{key}` | Section listing (`kathe`, `kavana`, `prabandha`, `vimarshe`) with "load more" |
| `/{pub}/{yyyy-mm-dd}` | Issue contents (all articles of the issue) |
| `/{pub}/{yyyy-mm-dd}/{slug}` | Article page; full text is server-rendered, no content API call |
| `/{pub}/issues` | Library (all issues) |
| `/{pub}/account` | Account: subscription, login IDs, signed-in devices, receipts link |
| `/{pub}/account/receipts` | Purchase receipts |
| `/{pub}/subscribe` | Plans; bundle/single-issue purchase entry |
| `/{pub}/about`, `/{pub}/advertise`, `/{pub}/privacy` | Static pages |
| `/mayura/{date}`, `/sudha/{date}` | Flipbook reader (client app; APIs documented above) |
| `/auth/login?from={path}` | Sign-in start; redirects to the SSO and back |

Reader deep link: `/mayura/{date}?goto={pageId}` opens a specific page of the issue.

### Client API endpoints

Extracted from the front-end bundles; same-origin, `credentials: same-origin`.

| Endpoint | Method | Auth | Purpose |
| --- | --- | --- | --- |
| `/api/entitlement` | GET | session cookie | Subscription state for the signed-in account |
| `/api/plans` | GET | none | Prices and plan IDs |
| `/api/free?pub={pub}&date={date}` | GET | none | Free page/article IDs for an issue |
| `/api/flip/token?pub={pub}&date={date}` | GET | session cookie | Mint the short-lived flip token |
| `/api/section?pub={pub}&key={key}&offset={n}&limit={n}` | GET | none | Article cards for a section / "load more" |
| `/api/account/sessions` | GET | session cookie | List signed-in devices; may renew the session |
| `/api/account/sessions/revoke` | POST (JSON) | session cookie | Revoke one session |
| `/api/account/sessions/revoke-others` | POST (JSON) | session cookie | Revoke all other sessions |
| `/api/checkout/order` | POST (JSON) | session cookie | Create a payment order (Razorpay) |
| `/api/promo/validate` | POST (JSON) | session cookie | Validate a promo code |
| `/api/payments/verify` | POST (JSON) | session cookie | Verify a completed payment |

`/api/section` response (abridged, real data):

```json
{
  "key": "kathe",
  "label": "ಕಥೆ",
  "total": 8,
  "grandTotal": 12,
  "issues": ["…"],
  "featured": null,
  "featuredTemplate": null,
  "cards": [
    {
      "id": "1993185209",
      "slug": "ತರಲೆ",
      "section_key": "kathe",
      "section_label": "ಪ್ರಬಂಧ",
      "headline": "ತರಲೆ",
      "byline": "",
      "excerpt": "ಕಲೆ: ಸಂತೋಷ್‌ ಸಸಿಹಿತ್ಲು…",
      "words": 294,
      "image": "https://d3fe7ja3iahxpd.cloudfront.net/MY/20260901/flipbook/pages/252508888.jpg",
      "date": "2026-09-01",
      "print_page": 22,
      "print_thumb": "https://d3fe7ja3iahxpd.cloudfront.net/MY/20260901/flipbook/thumbs/1738046.png",
      "free": false
    }
  ]
}
```

`/api/account/sessions` response (shape; values masked):

```json
{
  "ok": true,
  "sessions": [
    {
      "sid": "<session id>",
      "device": "Chrome on Windows",
      "country": "IN",
      "via": "sso",
      "createdAt": "<ISO timestamp>",
      "lastSeenAt": "<ISO timestamp>",
      "current": true
    }
  ],
  "current": "<sid>",
  "limit": 3,
  "renewed": "<new we_uid value — present only when the server renews the session>"
}
```

`via` values seen in the UI bundle: `sso` (ಪ್ರಜಾವಾಣಿ), `otp`, `purchase`.

### Session model and the "30-day no-refresh" behavior

Site cookies (host `vartasetu-magazine.tpml.in`):

| Cookie | HttpOnly | Lifetime | Purpose |
| --- | --- | --- | --- |
| `we_idt` | yes | ~30 days from login | Site session token |
| `we_uid` | no | ~1 year | Client-readable counterpart of the session |
| `flip_token` | no | ~3 hours | Flipbook asset access, `path=/flip` |

SSO cookies (host `id-staging.tpml.in`, SuperTokens): `sAccessToken`, `sRefreshToken` (~100 days), `sFrontToken`, Hydra/session cookies.

Observed renewal behavior:

- Plain API calls (`/api/entitlement`, `/api/flip/token`, asset fetches) set no cookies.
- `/api/account/sessions` can return `renewed`; the account page then writes `we_uid=<renewed>; path=/; max-age=31536000; samesite=lax`, and the server re-issues the HttpOnly `we_idt`. This gives rolling renewal while the site is used.
- Headless re-auth: `GET /auth/login?from=%2Fmy%2Faccount` with the SSO cookies in the jar follows ~7 redirects and returns fresh `we_idt` + `we_uid` — no browser, no credentials. Verified with curl on 2026-09-18.
- Result: the session is renewable server-side. The "30-day no-refresh" approach holds; a script can stay authenticated indefinitely by calling `/auth/login` (or `/api/account/sessions`) before the SSO refresh token (~100 days) lapses. Only `flip_token` needs frequent re-minting (~3 h, also scriptable).

### CDN mirror (public)

`d3fe7ja3iahxpd.cloudfront.net` mirrors the flipbook asset tree and serves it without authentication:

```text
GET https://d3fe7ja3iahxpd.cloudfront.net/{PUB}/{YYYYMMDD}/flipbook/index.json
GET https://d3fe7ja3iahxpd.cloudfront.net/{PUB}/{YYYYMMDD}/flipbook/pages/{pageId}.png
GET https://d3fe7ja3iahxpd.cloudfront.net/{PUB}/{YYYYMMDD}/flipbook/articles/{articleId}.html
GET https://d3fe7ja3iahxpd.cloudfront.net/{PUB}/{YYYYMMDD}/flipbook/thumbs/{file}
GET https://d3fe7ja3iahxpd.cloudfront.net/{PUB}/{YYYYMMDD}/flipbook/cover.jpg
```

Verified anonymously on 2026-09-18 (no cookies):

- Current Mayura issue page images and article HTML: `200`.
- Back issue Mayura July 2026 (`MY/20260701`): page image `200` (594,929 bytes), article HTML `200` with real `.articleDetail`/`.bodytext` content.
- The same paths on the site host return `403` without `flip_token` (`/flip/MY/...`).

This bypasses the `flip_token` protection enforced on the site host and leaves archived issue content publicly downloadable; it should be reviewed. The CDN path uses the same file names as the site route (`.png` serves JPEG bytes; a `.jpg` variant returns S3 `AccessDenied`).

### Sign-in flow

- `/auth/login?from={path}` on the site redirects to the TPML SSO at `id-staging.tpml.in` (label "ಪ್ರಜಾವಾಣಿ"; Google identity, SuperTokens). With a live SSO session the flow completes silently.
- Every page also loads `https://id-staging.tpml.in/config/vs` and `https://id-staging.tpml.in/consent-banner.js` for SSO configuration and the consent banner.
