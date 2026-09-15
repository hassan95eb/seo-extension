# SEO Lens — project context

Read this first. It exists so a fresh session can be useful immediately without
re-deriving decisions from the code.

## What this is

A Chrome extension (MV3) that audits any page for 40+ on-page SEO issues and — the point of
the whole product — **outlines the exact broken element on the page**. Bilingual Persian/English
with full RTL, and exports a branded, print-ready PDF report.

Repo: https://github.com/hassan95eb/seo-extension · Author: hassan95eb · Signature: `hassan mode : on`

## Why it exists / what makes it different

Verified against the competing extensions at source level (August 2026):

- Almost nobody does real on-page defect marking. Five of the top tools highlight only
  *nofollow links*, which is a category label, not a defect. The two extensions that do what
  SEO Lens does have ~70 users between them. **The highlight system is the product** — new
  checks should be things to highlight, not rows to add to a list.
- No competitor reads the page's `dir` attribute, applies bidi isolation to extracted text, or
  ships an RTL locale. 24 UI locales exist across the category; none are Arabic, Hebrew, Persian
  or Urdu.
- After v2.1 the permission model (`activeTab` + `scripting`, no host permissions) matches the
  cleanest in the category, which supports a "nothing leaves your browser" claim that
  Semrush/Ahrefs/Moz-backed tools structurally cannot make.

## File map

```
manifest.json          MV3 config. No content_scripts, no host_permissions — by design.
background.js          Service worker: injects on toolbar click, badge, opens report tab.
i18n.js                ALL display strings, both languages. The only file a new language touches.
audit.js               Audit engine. Emits code + params only. No human-readable text. Ever.
                       Three entry points: __SEO_LENS_AUDIT__() sync, then two async passes that
                       merge into the same report — __SEO_LENS_AUDIT_HEADERS__() (network) and
                       __SEO_LENS_AUDIT_LCP__() (performance timeline).
                       Also builds report.tables — raw image/link inventories for the CSV export.
content.js             Panel UI, highlight overlay, exports (PDF hand-off, CSV, tickets). Shadow DOM.
AGENTS.md              A byte-identical copy of this file, for tools that look for that name.
                       Edit CLAUDE.md and copy it over; do not let the two drift.
report.html/.css/.js   Print-ready A4 report page.
install.ps1            Windows installer/updater. Fetches latest release, preps folder.
_locales/              Store name + description (en, fa).
fonts/                 Vazirmatn, embedded so the PDF renders identically everywhere.
docs/                  Screenshots + the competitive gap analysis.
test/                  Playwright harness: HTTPS fixtures, engine assertions, screenshots.
```

## Hard rules — do not violate these

1. **`audit.js` contains no display strings.** It emits `code` + `params`; `i18n.js` decides
   wording per language. If a check needs a different sentence in some case, that is two message
   codes, not a string built in the engine. (See `A_STATS` / `A_STATS_NF` for the pattern.)
2. **No host permissions, no static content scripts.** Everything injects on click via
   `chrome.scripting` under `activeTab`. This is a deliberate trade and a marketing asset.
3. **Nothing leaves the browser.** No API keys, no accounts, no telemetry, no server calls for
   analysis. Report payloads are a hand-off buffer, deleted from storage once read.
4. **No dark patterns.** No auto-opening tabs, no donation nags, no update popups. The dominant
   complaint against competitors in user reviews is exactly this — one review calls a rival
   "malware" over it. Doing none of it is free differentiation.
5. **Severities:** `error` / `warning` / `info` / `pass` / `stat`. `stat` is a neutral
   measurement — excluded from the score and from the issue counters so a clean page reaches
   100/100. Do not reintroduce score-affecting informational rows.
6. **The panel lives in Shadow DOM** and must never alter the page it is auditing. Competitors
   have real reviews complaining that the extension breaks page styling; an auditing tool that
   mutates the artefact is a correctness bug.
7. **The first paint is synchronous.** `run()` returns immediately and the panel renders from
   it; anything needing the network goes in the async pass (`__SEO_LENS_AUDIT_HEADERS__`),
   which mutates the same report object and calls `finalize()` to recompute score, counts and
   ordering. Never make `run()` async — a panel that waits on a slow server is a worse tool.
8. **Anything lifted off the audited page is isolated before it is displayed.** Values
   interpolated into a sentence go through `fill()` in `i18n.js`, which wraps non-numeric
   values in U+2068/U+2069 so the same string is safe in the panel, the PDF and the clipboard
   export. Page-extracted snippets get `bdi dir="auto"`. This is the bug class the product
   claims to fix; shipping it in our own UI would be embarrassing.
9. **Locale-shaped rendering belongs in `i18n.js`, not the engine.** Retirement dates are
   emitted as ISO strings and formatted per language by `issue()` — the same rule as rule 1,
   applied to dates.

## How to test

There are no unit tests; SEO Lens is a DOM auditor, so verification means driving a real
browser. As of v2.2 that recipe lives in `test/` instead of in this paragraph:

```bash
cd test && npm install
openssl req -x509 -newkey rsa:2048 -keyout key.pem -out cert.pem -days 30 -nodes \
  -subj "/CN=localhost" -addext "subjectAltName=DNS:localhost"
npm test        # engine assertions + panel screenshots, non-zero exit on failure
npm run report  # renders report.html in both languages and screenshots it
```

The rules behind it, if you extend it:

- Serve fixtures over local HTTPS (self-signed is fine with `ignoreHTTPSErrors`), since
  `location.protocol` drives the HTTPS/mixed-content checks, and response headers can only be
  exercised from a real server.
- Inject `i18n.js` + `audit.js` with `addScriptTag`, call `window.__SEO_LENS_AUDIT__()`, then
  `await window.__SEO_LENS_AUDIT_HEADERS__(report)` for the header checks.
- For panel/export tests, stub `chrome.storage.local` and `chrome.runtime` before injecting
  `content.js`, then invoke the captured `onMessage` listener with `SEO_LENS_TOGGLE`.
- Screenshot the panel and the report and actually look at them — the RTL ones especially.
- The clean fixture must score exactly **100**. That invariant broke once already; it is the
  first assertion in the run.
- Every check needs a negative fixture too. `rtl-good.html` and `headers-ok.html` exist because
  a check that fires on correct pages is worse than no check.
- **Anything measured by the browser needs bytes the browser will accept.** Chrome ignores
  low-entropy images as LCP candidates, so the 1×1 data URI used elsewhere in the fixtures is
  never reported as the largest paint however large it is displayed. `fixtures.js` generates
  deterministic *noise* PNGs for that reason — incompressible on purpose, and generated rather
  than committed so the repo stays free of megabytes of binary test assets.
- Screen-dependent checks need a second context. The `devicePixelRatio` term in `IMG_OVERSIZED`
  is verified by auditing the same fixture at `deviceScaleFactor: 2` and asserting the finding
  is *absent* — a threshold change with no such test is an assertion, not a verification.

## Release process

1. Bump `version` in `manifest.json`, add a `CHANGELOG.md` entry.
2. Build a clean ZIP — extension files only. **Exclude** `README*.md`, `CHANGELOG.md`,
   `install.ps1`, `docs/`, `test/`, `.git`. `manifest.json` must sit at the ZIP root.
3. Commit, tag `vX.Y.Z`, `git push origin main --follow-tags`.
4. **Create a GitHub Release and attach the ZIP.** A git tag is not a Release — `install.ps1`
   reads `/releases/latest` from the API and 404s if no Release is published.

## Known environment gotcha

When a Cowork session runs **in the cloud**, the connected repo folder is read/write but files
cannot be deleted. Git creates `.git/index.lock`, fails to remove it, and every later git
command dies with "Unable to create index.lock: File exists." The user must delete that file
manually, or run the task on their computer instead. Git operations in a cloud session are
therefore best handed to the user as copy-paste commands.

Also set once: `git config core.filemode false` — the Windows mount otherwise reports every
file as modified.

## Current state

- **v2.6.0** shipped: gap-analysis item 8, phase **P0 only** — DOM checks and the LCP element,
  no byte measurement, no encoder, no manifest change. `__SEO_LENS_AUDIT_LCP__()` reads the
  largest paint with `buffered: true` and reports it as a `stat` (`LCP_IMG` / `LCP_TEXT`), with
  `LCP_LAZY` (warning) and `LCP_NO_PRIORITY` (notice) on top of it. Because `finalize()` sorts
  by severity and a `stat` sinks, the LCP finding also gets **its own slot in the panel header**
  — that was open question 8h.1, decided this way rather than by inflating its severity. New
  image checks: `IMG_LAZY_ABOVE`, `IMG_LEGACY_FORMAT`, `IMG_NO_SRCSET`. `IMG_OVERSIZED` now
  measures `naturalWidth > renderedWidth × devicePixelRatio × 1.5` and carries the ratio in its
  detail — a deliberate, CHANGELOG-visible scoring change. The LCP image is never counted twice:
  `dropElement()` removes it from `IMG_LAZY_ABOVE` before `finalize()` recomputes.
- **v2.5.0** shipped: gap-analysis item 2b, raw HTML versus the rendered DOM. The header pass's
  GET now reads body and headers together, and the diff reports coverage, H1/H2, JSON-LD, title,
  canonical and robots-meta differences — `RAW_NOINDEX_REMOVED` being the one that no DOM-only
  auditor can see.
- **v2.4.0** shipped: gap-analysis item 2c, the AI crawler robots.txt matrix. `/robots.txt` is
  fetched in parallel with the header request and parsed properly (groups, `*` fallback,
  longest-match with Allow winning ties, `*`/`$`, 500 KiB cap). Blocked **search** crawlers are
  a warning; blocked **training** crawlers and `Google-Extended` are `stat`, because opting out
  of training is a legitimate choice and must not cost points. A URL disallowed for Googlebot,
  an HTML `/robots.txt` and a 5xx `/robots.txt` are reported too. New `ai` category.
- **v2.3.1**: fixed the export menu, which rendered permanently open because
  `.sl-menu{display:flex}` outranks the UA sheet's `[hidden]{display:none}`. Any element
  in `PANEL_CSS` that sets `display` and is also hidden by attribute needs its own
  `[hidden]` rule. The v2.3.0 test drove the menu and still passed — **assert computed
  style, not the attribute**, whenever a test covers something being shown or hidden.
- **v2.3.0** shipped: gap-analysis item 5, developer hand-off. Copy-as-ticket per finding,
  copy-all-errors, and three CSV exports (findings one-row-per-element, plus image and link
  inventories now kept on `report.tables`). Spreadsheet formula injection is neutralised in
  every exported cell; files carry a UTF-8 BOM.
- **v2.2.1**: element lists are no longer truncated — the engine keeps every match up to
  `PATHS_CAP`, panel and report show 10 with a show-more toggle, print forces them open.
- **v2.2.0** shipped: gap-analysis items 1, 3 and 4. Pixel-measured titles and descriptions,
  `dir` checked as a defect, unisolated bidi runs outlined on the page, bidi isolation
  throughout the panel and PDF, `X-Robots-Tag` and `Link:` canonical read from the response
  headers, retired rich-result types flagged with their retirement dates, and schema values
  that contradict the visible page. `test/` holds the Playwright harness.
- **v2.1.0**: minimal permissions, `stat` severity so 100/100 is reachable, report data deleted
  after read, unified language detection, engine free of display strings.
- `install.ps1` added for one-command install/update on Windows.

## What's next

`docs/gap-analysis.md` holds the researched, prioritised list, based on reading the source of
ten competing extensions. Items 1, 2, 3, 4, 5 and 8-P0 are done. What remains, in order:

1. **Image weight, measured — item 8 phase P1.** Real bytes for **same-origin** images from
   `performance.getEntriesByType('resource')`, plus the **Optimize** action: re-encode at the
   rendered width with `OffscreenCanvas.convertToBlob({type:'image/webp', quality:0.82})`,
   show measured before/after bytes, hand back the file. Read 8d, 8e and 8h first. Three things
   decided there and not yet built: **encode in `background.js`**, not in a page-CSP-bound
   worker (8h.2); **when the size is unknown the UI says "unknown", never "0 KB"** (8e), which
   is two message codes, not a string built in the engine; and byte values must ride in
   `params` or `detailRaw` or `serializeReport()` drops them before the PDF ever sees them
   (8h.3). Same-origin only keeps the permission model untouched — P2, the cross-origin case,
   is the one that needs `optional_host_permissions` and is a positioning call, not a coding one.
2. **Core Web Vitals with visual attribution** — gap-analysis item 6, narrowed to INP and CLS
   because item 8 took LCP with it. `LayoutShiftAttribution.node` exposes the offending element,
   which the highlight system can outline. The LCP pass added in v2.6.0 is the shape to copy:
   a third async entry point, `stat` severity, and the honest caveat in the wording.
3. **Accessibility framed for the European Accessibility Act** — gap-analysis item 7, parked.

Do **not** build: an llms.txt score, or any "schema → AI citation" claim. Google's own docs say
Search ignores llms.txt and that no special schema is needed for AI features.

## Judgement calls worth not re-litigating

- **Pixel budgets are 580px/920px at 20px/13px Arial.** Calibrated, not guessed: 60 English
  characters measure ~540px and 160 characters ~911px, which lines up with the character
  guidance the whole industry publishes. Change the budget and the font together or not at all.
- **The pixel claim is deliberately modest.** Measurement showed Persian characters are ~7%
  *narrower* than English at the same size, and ZWNJ inflation is only 1–3 characters. The real
  effect is variance — Persian pixel width is ~1.6× more variable at identical character count.
  The UI says that, and should keep saying that rather than overclaiming.
- **`dir` findings only fire on pages that are actually RTL**, by declared language or by the
  script of their own text. `dir` is genuinely optional on an LTR page and flagging it there
  would be noise.
- **`SD_INVISIBLE` only tests numbers**, and only flags when the value is absent entirely.
  `name` was considered and rejected — it is abbreviated too often to test without false
  positives, and a false accusation of policy violation is expensive.
- **Exported cells are neutralised against spreadsheet formula injection.** A value lifted off
  the audited page that starts with `=`, `+`, `-` or `@` executes when the CSV is opened in
  Excel, so every such cell is prefixed with an apostrophe. This is the same rule as bidi
  isolation (hard rule 8) applied to a different surface: text taken off a page is never
  trusted by the thing that displays it. Any future export path inherits this obligation.
- **The inventories in `report.tables` are raw and export-only.** `scope` is a token
  (`internal` / `external` / `other`) exactly the way `severity` is a token — `i18n.js` owns
  the wording. They are deliberately not in `serializeReport()`: the PDF is the client-facing
  document and does not need a 400-row link table.
- **The findings CSV is one row per element, not per finding.** Joining selectors into a single
  cell is the same mistake v2.2.1 spent a release removing from the panel.
- **Blocking a training crawler is a `stat`, not a finding.** `GPTBot`, `ClaudeBot` and
  `Google-Extended` are deliberate policy choices that a site is entitled to make, so costing
  them points would be a false accusation — the value is in saying what they do *not* do
  (they do not remove the page from AI answers; `Google-Extended` does not touch AI Overviews).
  Only the **search** crawlers — `OAI-SearchBot`, `Claude-SearchBot`, `PerplexityBot` — cost
  anything, because blocking those is the mistake people make by accident.
- **Being the LCP element is a `stat`, and the panel layout is what carries it.** Under hard
  rule 5 a measurement costs no points, and `finalize()` sorts strictly by severity, so the most
  useful line in a performance audit would sit under everything else. Promoting it to `warning`
  to move it up would charge a clean page for doing nothing wrong. The slot in the panel header
  solves the visibility problem where it actually lives, and the list row stays where it belongs.
- **The LCP image is charged once.** An above-the-fold lazy image that turns out to be the
  largest paint is reported by `LCP_LAZY` and removed from `IMG_LAZY_ABOVE` by `dropElement()`.
  Two rows and −8 for one mistake is not a stricter audit, it is a wrong one. Any future finding
  that can overlap with a generic one inherits this obligation.
- **Overscale is measured against `devicePixelRatio`, and the detail says so.** A 2× asset on a
  2× screen is correct authoring; the same file on a 1× screen is twice the bytes it needs. The
  old bare `× 2` got both cases wrong, in opposite directions. The ratio is in `detailRaw`
  because the same finding on a different display would otherwise read as a false positive.
- **A format is only named when the URL names it.** `imgFormat()` returns "" for an
  extensionless CDN path and `IMG_LEGACY_FORMAT` skips it. Guessing would produce confident
  accusations on exactly the sites most likely to be audited, and `currentSrc` is used rather
  than `src` so a responsive image is judged by the file that was actually downloaded.
- **Ambiguous retired types are `info`, not `warning`.** `Course` and `LearningResource` still
  have non-rich-result uses, so they sit in `DEPRECATED`; only unambiguous ones cost 4 points.
