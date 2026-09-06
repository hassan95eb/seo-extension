# Changelog

## v2.4.0

Gap-analysis item 2c: the AI crawler robots.txt matrix. The engine now reads the site's own
`/robots.txt` and says which crawlers this exact URL is closed to — and, more usefully, what
closing each one actually costs.

### The blocked-crawler distinction nobody surfaces

Sites blanket-blocked "OpenAI" and "Anthropic" in 2023–24 and killed their ChatGPT and Claude
*search citations* while believing they had only opted out of model training. The agents are
separate and each vendor documents them:

- **Search crawlers blocked** (`OAI-SearchBot`, `Claude-SearchBot`, `PerplexityBot`) is a
  **warning**. The page cannot be cited in AI answers.
- **Training crawlers blocked** (`GPTBot`, `ClaudeBot`) is a **stat** — a measurement, not a
  defect. Opting out of training is a legitimate policy choice and must not cost a page points;
  what the finding adds is that it does *not* remove the page from AI answers.
- **`Google-Extended` blocked** is a stat too, and exists to kill the most common myth in the
  category. Google's own crawler documentation says it "does not impact a site's inclusion in
  Google Search nor is it used as a ranking signal" — it governs Gemini training and grounding.
  Staying out of AI Overviews is what `nosnippet` does, which the header pass already reports.

### Three things that fall out of the same parse

- **`ROBOTS_BLOCKS_PAGE`** — this URL is disallowed for Googlebot: an error, and a bigger one
  than anything the AI matrix reports. The page is never crawled, so a `noindex` on it is never
  read either, and it can still surface as a bare link. No DOM-only auditor sees this.
- **`ROBOTS_HTML`** — `/robots.txt` answering with the site's HTML shell, the SPA catch-all
  mistake. Every rule the owner thinks they have is being ignored, so no rule is parsed from it.
- **`ROBOTS_5XX`** — a server error on `robots.txt` is not an absent file: crawlers read it as a
  full disallow for the whole host until it recovers. A 404 there is safe; a 500 is not.

### The parser

Real robots.txt semantics, not a substring search: consecutive `User-agent:` lines share a
group, a named group wins outright over `*`, the longest matching rule wins inside a group with
`Allow` taking the tie, `*` and `$` are honoured, an empty `Disallow:` means allow-all, and the
file is read only to the 500 KiB Google itself stops at.

### Everything else

- New `ai` category, so the AI-visibility findings read as one group in the panel and the PDF.
- One extra same-origin `fetch`, issued in parallel with the existing header request inside
  `__SEO_LENS_AUDIT_HEADERS__`. No new permission, and neither request failing can suppress the
  other. The first paint is still synchronous.
- All wording lives in `i18n.js` in both languages; the engine emits agent tokens and matched
  rules as data, as it does everywhere else.
- `test/` gains a path-scoped `robots.txt` fixture plus two extra origins (:8444 serving HTML
  for `/robots.txt`, :8445 serving a 503) and eighteen assertions — including that a blocked
  training crawler leaves the score untouched and that `clean.html` still scores exactly 100.

## v2.3.1

### The export menu never closed

`.sl-menu` sets `display:flex`, which silently outranks the user-agent stylesheet's
`[hidden]{display:none}` — a class selector beats it. So the menu rendered permanently
open under the toolbar and clicking the button appeared to do nothing: the `hidden`
attribute was toggling correctly the whole time, it just had no effect on layout.

- `.sl-menu[hidden]{display:none}` added, which is what any element whose CSS sets
  `display` needs if it is also hidden by attribute.
- The outside-click handler now lives on `document` and is registered once, instead of
  being re-added to the shadow root on every language switch. Clicking anywhere that is
  not the button or a menu item closes the menu — including on the audited page, which
  the previous shadow-scoped listener never saw.
- The harness now asserts the menu's **computed display**, not its attribute. The v2.3.0
  test drove the menu and passed, because it clicked the button and then the item and
  never asked whether anything was actually visible. Removing the fix now fails the run.

## v2.3.0

Gap-analysis item 5: developer hand-off. The verified number-one request across every
competing extension's review corpus is not more checks — it is getting the findings *out*.
The PDF report was already the client-facing exit; this release adds the developer-facing one.

### A finding can be pasted into a tracker

- Every finding now has a **Copy as ticket** button next to *Show on page*. The ticket carries
  the page URL, the severity, the category, the issue code, every affected element with its
  selector and its text, the current value, why it matters, the suggested fix — and an
  acceptance criterion. Passing checks and neutral stats have no button; they are not tickets.
- The acceptance criterion is deliberately generic: *a fresh audit of this URL no longer
  reports `CODE`*. It is verifiable with the same tool that raised the finding, which is the
  difference between a ticket that gets closed and a ticket that gets argued about. No
  competitor in the category emits a ticket format at all.
- **Copy all errors** does the same for every error on the page in one clipboard write.

### CSV export

- **Findings CSV** — one row per *element*, not per finding, so a finding covering 23 images
  is 23 sortable rows and nothing has to be crushed into one cell. Columns: severity, category,
  code, issue, detail, fix, element count, element path, element text, page URL.
- **Images CSV** and **Links CSV** — the two tables users ask for by name. The engine now keeps
  an inventory of every image (src, alt, whether alt exists at all, rendered and natural size,
  `loading`, visibility, above-the-fold) and every link (href resolved to absolute, text, scope,
  `rel`, `target`, nofollow, visibility), each with its selector. Both are capped at 1000 rows
  and the untruncated total is kept, so a huge page says it was capped instead of quietly
  shipping a short file.
- **Cells that a spreadsheet would execute are neutralised.** A value lifted off the audited
  page starting with `=`, `+`, `-` or `@` is a formula to Excel; every such cell is prefixed so
  it stays text. This is the same principle as the bidi isolation added in v2.2 — data taken
  off a page is never trusted by the surface that displays it.
- Files are written with a UTF-8 BOM, without which Excel opens a Persian CSV as mojibake.
  The download anchor is created inside the panel's own shadow root, so the audited document
  is still never touched.

### Everything else

- All new wording lives in `i18n.js` in both languages, including the CSV column headers and
  the `internal` / `external` scope labels; the engine emits raw values and tokens only.
- The report payload and the PDF are unchanged — the inventories are export-only and never
  enter `serializeReport()`.
- `test/` gains an `assets.html` fixture and nineteen assertions covering the inventories, all
  three CSVs, the formula-injection guard, the ticket format and copy-all-errors. The clean
  fixture still scores exactly 100.

## v2.2.1

### Element lists are no longer truncated

The list of offending elements was being cut at three independent points: the engine kept
only the first 12 references per finding, the panel rendered 6 of those and the report 8,
collapsing whatever was left into a bare `+15` with no way to reach it. A finding covering
23 images therefore exposed a third of them, and the two upper layers could not have shown
more even if they wanted to — the data had already been thrown away in `finalize()`.

- The engine now keeps every matched element, bounded at `PATHS_CAP = 300` so a pathological
  document cannot blow up memory.
- Panel and report render the first 10 rows and add a **Show N more / Show less** toggle for
  the remainder. Nothing is hidden without a way to reveal it.
- Print styles force every collapsed list open and hide the toggle itself, so an exported PDF
  is complete regardless of what happened to be expanded on screen. A client-facing report
  that silently dropped rows would be worse than no report.
- The plain-text clipboard export lists every element instead of the first five.
- Dropped the fixed-height inner scrollbar on the panel's element list; it now flows into the
  panel's own scroll, which reads better once a list can be long.

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
