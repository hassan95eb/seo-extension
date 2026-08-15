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
                       Two entry points: __SEO_LENS_AUDIT__() sync, __SEO_LENS_AUDIT_HEADERS__() async.
content.js             Panel UI, highlight overlay, exports. Shadow DOM.
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
ten competing extensions. Items 1, 3 and 4 are done. What remains, in order:

1. **AI visibility (documented parts only)** — gap-analysis item 2. `nosnippet`/`max-snippet`
   is already handled by the header pass; what is left is 2b, the raw-HTML vs rendered-DOM
   diff (AI crawlers do not execute JavaScript, so a JS-heavy page can rank in Google and be
   invisible to ChatGPT and Perplexity), and 2c, the `GPTBot` vs `OAI-SearchBot` robots.txt
   distinction. **`auditHeaders()` already performs the fetch 2b needs** — switch its GET
   fallback to always read `response.text()` and diff it against the DOM.
2. **Developer hand-off output** — gap-analysis item 5. A finding formatted as a paste-ready
   ticket, CSV export of the findings and of the images/links tables, a "copy all errors"
   button. Nobody in the category does the ticket format, and the #1 verified user request is
   getting data *out*. Everything needed is already stored; it is formatting work.
3. **Core Web Vitals with visual attribution** — gap-analysis item 6. The interesting part is
   that `LargestContentfulPaint.element` and `LayoutShiftAttribution.node` expose the offending
   element, which the highlight system can outline. Say plainly in the UI that a single visit
   is not field data.

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
- **Ambiguous retired types are `info`, not `warning`.** `Course` and `LearningResource` still
  have non-rich-result uses, so they sit in `DEPRECATED`; only unambiguous ones cost 4 points.
