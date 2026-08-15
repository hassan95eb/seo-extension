# Changelog

## v2.2.0

Three checks from `docs/gap-analysis.md`, in the order that document recommended. Each one
fixes something that is genuinely wrong on real pages and that no competing extension
catches — verified by reading their source, not their marketing.

### Persian and Arabic content is now measured correctly

- **Titles and descriptions are measured in pixels**, with `canvas.measureText()` against
  Google's real budgets (~580px for titles, ~920px for snippets), and reported alongside the
  character count. Google truncates by rendered width; character count is a proxy, and it is
  roughly 1.6× noisier in Persian than in English because cursive joining changes glyph width
  dramatically — `ببب` renders about 45% narrower than three isolated `ب`. Character
  thresholds remain as the fallback when a page blocks the 2D canvas context.
- **ZWNJ (U+200C) no longer counts as a character.** It is a joining control, and counting it
  inflated every Persian title by one to three characters.
- **`dir` is now checked as a defect.** `lang="fa"` with `dir="ltr"` is an error; `dir`
  declared on `<body>` instead of `<html>`, or missing entirely on a page whose own text is
  right-to-left, is a warning; a correctly declared page passes. No other extension in the
  category reads the attribute at all.
- **Unisolated bidirectional text is flagged and outlined on the page.** Latin brand names and
  version numbers inside Persian headings and link labels reorder on render — "iPhone 15 Pro"
  displays as "Pro 15 iPhone" — unless the run is isolated. Elements already using `<bdi>`,
  `dir` or `unicode-bidi: isolate` are correctly left alone.
- **The panel and the PDF now isolate every value they lift off the audited page.** Raw values
  interpolated into a sentence are wrapped in U+2068/U+2069 by `i18n.js`, which works
  identically in the panel, the report and the plain-text clipboard export. Page-extracted
  snippets carry `bdi dir="auto"`; the path, title, description and URL fields are
  `unicode-bidi: isolate`.

### `X-Robots-Tag` — directives that never appear in the DOM

- One same-origin request (HEAD, falling back to GET) reads the response headers and catches
  **header-delivered `noindex`**, which is invisible in the page source and which every
  DOM-only auditor reports as perfectly healthy. Also `nofollow`, `nosnippet` and
  `max-snippet:0` — which per Google's robots-meta docs also remove the page from AI Overviews
  and AI Mode — and an `unavailable_after` date already in the past.
- A `Link: rel="canonical"` response header that contradicts the `<head>` canonical is
  reported; when two canonicals disagree, Google ignores both.
- Rules scoped to a user agent (`bingbot: noindex`) are parsed and ignored rather than
  mis-reported.
- The request runs **after** the synchronous audit has painted, so the panel never waits on
  the network. Score, counts and ordering are recomputed when the response lands.

### Retired rich results

- `FAQPage` (stopped appearing 7 May 2026), `HowTo` (2023), `SpecialAnnouncement`,
  `Occupation`, `Vehicle` and `Quiz` are flagged as producing no rich result. `Course`,
  `ClaimReview`, `LearningResource` and the sitelinks-searchbox `SearchAction` are reported as
  deprecated. Retirement dates are emitted as language-neutral ISO strings and rendered per
  locale by `i18n.js` — Persian shows the Jalali date.
- This is the gap validators cannot fill: they check schema.org conformance, so a retired type
  validates cleanly for ever.
- **Schema values that contradict the visible page** are flagged. `offers.price` and
  `aggregateRating.ratingValue` are looked for in the page text, with Persian and
  Arabic-Indic digits normalised first, so `۱٬۲۹۹٬۰۰۰` on the page matches `1299000` in the
  JSON-LD. Marking up invisible content is against Google's structured-data policy, and price
  mismatches are the most common cause of manual actions.

### Verification harness

- `test/` now holds the Playwright recipe CLAUDE.md previously described in prose: local
  HTTPS fixtures, engine assertions, and screenshots of both the panel and the report in both
  languages. `npm test` exits non-zero on the first failure, and the clean fixture — which
  must score exactly 100 — is asserted first.

## v2.1.0

### Installer
- Added `install.ps1`: downloads the latest release, unpacks it to a stable path, validates the
  manifest, and copies the folder path to the clipboard. Re-running it updates in place, so
  Chrome keeps the extension registered and only needs a reload. Chrome removed the
  `--load-extension` flag in Chrome 137, so the final "Load unpacked" click cannot be scripted
  by anyone — the script removes every step except that one.

Hardening pass over v2.0. No features removed. Every item below has a verification
recipe in the README, under "v2.1 — what changed and how to check it".

### Permissions
- Removed the `content_scripts` block and `host_permissions: <all_urls>`. Nothing runs on any
  page until the toolbar icon is clicked; injection goes through `chrome.scripting` under
  `activeTab`, so Chrome no longer shows the "read and change all your data on all websites"
  warning at install.
- Dropped `web_accessible_resources` — the report page is an extension page and never needed it.
- `isInjectable()` rewritten as an explicit allow-list; the previous scheme loop was unreachable.

### Scoring
- New `stat` severity for neutral measurements. The link-count summary used to be emitted as an
  `info`, which silently cost every page one point and inflated the notice counter — no page
  could score above 99. Stats are now excluded from the score and counted separately under
  `counts.stats`.

### Privacy
- Report payloads are written under a unique key, sweep older payloads first, and are deleted
  from `chrome.storage.local` as soon as the report page has read them. A per-tab
  `sessionStorage` copy keeps the report alive across a refresh and disappears with the tab.
- Favicon URLs taken from the audited page are validated before reaching the report DOM; only
  `http:`, `https:` and `data:image/…` are accepted.

### Consistency
- Panel and report now share one language-detection path, and the detected language is persisted
  on first run. Previously the report page fell back to Persian regardless of the panel.
- Removed the last display strings from the engine: the Persian `console.warn` in
  `background.js`, and the `" · N nofollow"` suffix that `audit.js` assembled itself — now the
  separate `A_STATS_NF` message code, with the wording owned by `i18n.js`.

## v2.0.0

### Bilingual (English / Persian)
- All display strings moved out of the audit engine into `i18n.js`. `audit.js` now emits only `code` + `params` and carries no language strings at all.
- Language toggle in both the panel and the report page; the choice is persisted in `chrome.storage`.
- Browser language is auto-detected on first run, with a full RTL/LTR switch for the panel, highlight labels and report.
- Extension name and description are now localised too (`_locales/en` + `_locales/fa`).
- Adding a third language requires adding one key to `i18n.js` — nothing else changes.

### PDF report export
- Dedicated print-ready report page with an A4 layout and print-specific styling.
- Header carries the logo, site name, page URL and date (Persian calendar in Persian mode).
- Logo is pulled automatically from the site's `favicon` or `apple-touch-icon`.
- Custom logo upload for white-label client reports; the logo is stored and reused on later reports.
- Score gauge, stat cards, severity-coded findings, and a separate section listing what is correctly implemented.
- Vazirmatn is embedded so the output renders identically on any machine.

### Fixes
- Fixed bidirectional text rendering for sentences starting with a Latin word — translated strings are now separated from raw values, with `bdi` applied only to the latter.
- Added a dedicated warning when a page has no internal links.
- Image width/height detection now accounts for `aspect-ratio`.

## v1.0.0

- Initial release: 40+ SEO checks, Persian panel, on-page highlighting of the offending element, and plain-text report export.
