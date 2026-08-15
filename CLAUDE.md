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
content.js             Panel UI, highlight overlay, exports. Shadow DOM.
report.html/.css/.js   Print-ready A4 report page.
install.ps1            Windows installer/updater. Fetches latest release, preps folder.
_locales/              Store name + description (en, fa).
fonts/                 Vazirmatn, embedded so the PDF renders identically everywhere.
docs/                  Screenshots + the competitive gap analysis.
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

## How to test

There is no test suite. Verification is done by driving real Chromium with Playwright — this
has caught real bugs and is worth continuing:

- Serve fixture pages over local HTTPS (a self-signed cert is fine with `ignoreHTTPSErrors`),
  since `location.protocol` drives the HTTPS/mixed-content checks.
- Inject `i18n.js` + `audit.js` with `addScriptTag` and call `window.__SEO_LENS_AUDIT__()`.
- For panel/export tests, stub `chrome.storage.local` and `chrome.runtime` before injecting
  `content.js`, then invoke the captured `onMessage` listener with `SEO_LENS_TOGGLE`.
- Screenshot the panel and the report and actually look at them.
- Keep a deliberately clean fixture page — it should score exactly 100.

## Release process

1. Bump `version` in `manifest.json`, add a `CHANGELOG.md` entry.
2. Build a clean ZIP — extension files only. **Exclude** `README*.md`, `CHANGELOG.md`,
   `install.ps1`, `docs/`, `.git`. `manifest.json` must sit at the ZIP root.
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

- **v2.1.0** shipped: minimal permissions, `stat` severity so 100/100 is reachable, report data
  deleted after read, unified language detection, engine free of display strings.
- `install.ps1` added for one-command install/update on Windows.

## What's next

`docs/gap-analysis.md` holds a researched, prioritised list of what to build, based on reading
the source of ten competing extensions. Short version, in order:

1. **RTL correctness** — check `dir` as a defect, bidi-isolate extracted text in the panel and
   PDF, measure titles in pixels rather than characters. Zero competitors do any of it.
2. **AI visibility (documented parts only)** — `nosnippet`/`max-snippet` silently excluding a
   page from AI Overviews; raw-HTML vs rendered-DOM diff, because AI crawlers do not run JS;
   the `GPTBot` vs `OAI-SearchBot` robots.txt distinction.
3. **`X-Robots-Tag`** — header-delivered `noindex` is invisible in the DOM. One same-origin
   `fetch` gets it, and the same fetch powers item 2.
4. **Dead schema types** — `FAQPage` stopped producing rich results on 7 May 2026, `HowTo` in
   2023. A lookup table against `@type`, which is already extracted.
5. **Developer hand-off output** — a finding formatted as a paste-ready ticket. Nobody does this,
   and the #1 verified user request across the category is getting data *out*.

Do **not** build: an llms.txt score, or any "schema → AI citation" claim. Google's own docs say
Search ignores llms.txt and that no special schema is needed for AI features.
