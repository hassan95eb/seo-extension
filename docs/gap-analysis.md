# SEO Lens — where the competitors leave a hole

Research date: 15 August 2026. Ten competing extensions examined, several decompiled and read at source level.

---

## The market, in one table

| Extension | Users | Rating | Highlights on page? | Export | RTL |
|---|---|---|---|---|---|
| SEOquake (Semrush) | 1,000,000 | 4.5 lifetime / **1.90 recent** | No | CSV, PDF | No |
| SEO META in 1 Click | 900,000 | 4.87 | No | **None at all** | No |
| MozBar | 900,000 | 3.3 | Links only | CSV | No |
| Detailed SEO (Ahrefs) | 600,000 | 4.91 | nofollow links only | CSV | No |
| Keyword Surfer | 600,000 | 4.2 | No | CSV | No |
| Ahrefs SEO Toolbar | 400,000 | 4.4 | nofollow links only | CSV | No |
| SEO Minion | 200,000 | 4.02 | **Best — but now $168/yr** | Excel | No |
| META SEO Inspector | 200,000 | 4.37 | No | Print report | No |
| SEO Pro | 100,000 | 4.81 | nofollow links only | CSV ×3 | No |
| *Visual SEO Audit* | *53* | — | *Yes, properly* | — | No |

The last row is the important one. The thing SEO Lens does — pinning a marker to the actual broken element — exists in exactly two extensions, with **70 combined users**. Everyone else either lists issues in a panel or highlights *nofollow links*, which is a category label, not a defect.

## Three things happening right now that you can use

1. **SEOquake shipped v4.0.0 in August 2026 and removed the SERP bar.** Its lifetime rating is 4.5; its *recent* rating is **1.90**. Reviews from this week: *"These morons got rid of the bar"*, *"Refresh of the UI was nice but not asked for, especially when functions have been removed to make it now kind of useless."* A million users are unhappy this month.
2. **SEO Minion — the only tool with genuinely good on-page highlighting — went paid.** No free tier; Silver plan is $168/yr. Its rating fell to 4.02 and the reviews are three years of the same complaint. Most "best SEO extensions 2026" listicles still describe it as free, so its users are actively discovering this and looking for a replacement.
3. **SEO META in 1 Click (900k users) last shipped August 2024** and has **no export of any kind**. An unofficial clone of it already exists, which tells you the vacuum is real.

## What users actually keep asking for

The pattern across every review corpus is not "more checks." It is **egress** — getting findings out of the panel:

> *"Great app, could be better, in ability save/export results is a big deal."*

The one vendor that publishes its changelog (Detailed) shows the same thing — recent additions were: copy headings to clipboard, export People-Also-Ask to CSV, download schema as JSON. All exits, no new analysis.

**SEO Lens already ships a branded PDF report.** That puts it ahead of every free competitor on the single most-requested axis. This is your strongest existing asset and it is under-exploited.

The second pattern is **trust burned by dark patterns**, not by bad analysis. META SEO Inspector's dominant complaint is auto-opening tabs and donation prompts whose opt-out is broken — one review calls it malware. Detailed and SEO Pro have the same complaint at lower volume. Doing none of this is free differentiation.

---

# The gap list

Ordered by what I would build first.

> **Status, updated with v2.3.0:** items **1**, **3**, **4** and **5** are shipped. Item 2a
> (`nosnippet` / `max-snippet`) came along with item 3, since both read the same response.
> Items 2b, 2c, 6, 7 and 8 are still open. The per-item headings below carry their own status.

> **Added 5 September 2026:** item **8**, image weight and LCP. It is not from the August
> competitor sweep — it comes out of the same question item 6 raises (`LargestContentfulPaint`
> exposes the offending element, and this extension already outlines elements) and it takes
> the LCP half of item 6 with it. Item 6 is narrowed to INP and CLS accordingly. The decisions
> recorded under 8 are settled, not options.

---

## 1. Make the checks correct for Persian and Arabic content — ✅ shipped in v2.2.0

**This is the one nobody can copy from you, and right now SEO Lens has the same gaps as everyone else.**

I read the source of all six major extensions. Across every one of them:

- **Zero** read the page's `dir` attribute
- **Zero** use `dir="auto"` or `unicode-bidi` when displaying extracted text
- **Zero** use `measureText` — every length check is naive `String.length`
- **Zero** ship an Arabic, Hebrew, Persian or Urdu locale, across 24 locales total

I then checked `audit.js`. It has the same three defects: no `dir` reading, no pixel measurement, `title.length` and `desc.length` at lines 106 and 121.

So the Persian-language SEO extension is not Persian-*content*-aware. That is worth fixing on its own merits, and it is a headline nobody else can write.

### 1a. Measure title and description in pixels, not characters

Google truncates SERP titles by **rendered pixel width (~580px desktop)**, not character count. Every extension in the category — and `audit.js` lines 106 and 121 — uses `String.length`.

**I measured this rather than assuming it, and the result was smaller than I expected. Reporting it honestly:**

I rendered real Persian and English titles in Chromium (Persian fonts confirmed present, Arabic cursive shaping confirmed working) and measured with `measureText`:

- A Persian character is about **7% narrower** than an English one at the same size — *not* dramatically wider, which is what I had assumed going in.
- ZWNJ (U+200C) inflation in typical Persian titles is only **1–3 characters** — real, but not the distortion I expected.
- The genuine effect is **variance**. Take five titles of exactly 50 characters each: English widths spread 42px (8.8% of the mean), Persian spread 67px (**14.6%**). Persian pixel width is roughly **1.6× more variable** at identical character count, because cursive joining changes width dramatically — `ببب` renders 45% narrower than three isolated `ب`.

So the honest claim is not "character counts are badly wrong for Persian." It is: **character count is a noisy proxy for the thing Google actually measures, and it is ~1.6× noisier in Persian than in English.** Switching to pixels is a real improvement for every language and a somewhat larger one for yours.

**Fix:** `canvas.measureText()` against the ~580px budget, report px alongside characters, exclude ZWNJ from the character count. Cheap, correct, and nobody else does it.

### 1b. Check `dir` as an SEO/accessibility defect

Missing or wrong `dir="rtl"` is one of the most common real defects on Persian and Arabic sites, and literally no tool checks it. You already check `lang` — this is the same shape of check, sitting right next to it.

Worth flagging separately: `dir` missing entirely; `dir` on `<body>` instead of `<html>`; `lang="fa"` with `dir="ltr"`; mixed-direction runs where Latin brand names and digits inside Persian headings need isolation.

### 1c. Isolate extracted text in your own UI

You already fixed one bidi bug in v2.0 (the `<bdi>` work in the CHANGELOG). Auditing the panel and PDF for the remaining cases — heading outlines especially, which is where the scrambling is worst — finishes the job. The heading outline is simultaneously the most-praised feature in this category and the one that breaks hardest on RTL content.

**Effort:** small. **Differentiation:** high — I verified at source level that zero competitors do any of this, and it fixes real gaps in your own tool. Note the honest weighting: **1b and 1c are the strong items** (clear defects, zero competition); **1a is a genuine but modest improvement** that my own measurement talked me down on.

---

## 2. AI visibility — but only the parts that are actually documented — ◐ 2a shipped, 2b/2c open

Most "AI SEO" tooling is folklore. Three things here are documented by Google and are the real gates, and no extension surfaces them as AI-visibility signals.

### 2a. `nosnippet` and `max-snippet` silently remove a page from AI Overviews

Google's robots-meta documentation is explicit: `nosnippet` "will also prevent the content from being used as a direct input for AI Overviews and AI Mode," and `max-snippet` limits AI use the same way. Conflicts resolve most-restrictive-wins.

Plenty of sites set `max-snippet:0` or inherit `nosnippet` from a plugin default and have no idea they have opted out of AI Overviews. Every extension reads meta-robots as a binary index/noindex readout and stops.

**Fix:** compute the *effective* directive across `<meta name="robots">`, `<meta name="googlebot">`, `X-Robots-Tag`, and every `data-nosnippet` attribute — then report it as **"AI Overviews: excluded"**, not as a generic snippet note.

### 2b. Raw HTML vs rendered DOM — AI crawlers do not run JavaScript

Vercel measured this across its network: none of the major AI crawlers (OpenAI, Anthropic, Perplexity, Meta, ByteDance) execute JavaScript. Googlebot does. So a JS-heavy page can rank fine in Google and be **completely invisible** to ChatGPT and Perplexity.

You can measure this from a content script with no server: `fetch(location.href)` is same-origin, parse with `DOMParser`, and diff raw against rendered — word count, H1/H2 presence, JSON-LD blocks, title, canonical, meta robots. Report a **"raw HTML coverage %"**.

This same diff catches a brutal, silent, DOM-invisible bug Google documents explicitly: **`noindex` present in the raw HTML and removed by JavaScript.** Google may skip rendering entirely when it sees `noindex`, so the page stays deindexed forever while every DOM-based tool reports it as perfectly fine. Ahrefs Toolbar is the only competitor doing any raw-vs-rendered comparison, and it does not frame it this way.

### 2c. The AI crawler robots.txt matrix

A genuinely common and expensive misconfiguration: sites blanket-blocked "OpenAI" in 2023–24 and killed their **ChatGPT search citations** while believing they only opted out of training. The bots are separate:

| Blocking this | Costs you |
|---|---|
| `GPTBot` | Training inclusion only |
| `OAI-SearchBot` | **ChatGPT search citations** |
| `ClaudeBot` | Training inclusion only |
| `Claude-SearchBot` | **Claude search citations** |
| `PerplexityBot` | **Perplexity citations** |
| `Google-Extended` | Gemini app grounding — **does not** affect AI Overviews |

That last row is its own widespread myth. `robots.txt` is same-origin, so `fetch('/robots.txt')` needs no extra permission.

**Effort:** medium (2a and 2c small, 2b medium). **Differentiation:** high, and defensible from primary Google/OpenAI/Anthropic docs rather than SEO blogs.

**Do not build:** an "llms.txt score" or a "schema → AI citation" score. Google's own documentation says Search ignores llms.txt and that no special schema is needed for AI features. The largest AI-visibility correlations are off-page brand signals you cannot measure client-side. Being the tool that says this plainly is worth more than a fake score.

---

## 3. `X-Robots-Tag` — a whole class of invisible killers — ✅ shipped in v2.2.0

`noindex` delivered as an HTTP header does not appear in the DOM. SEO Lens does not check it. Neither do most competitors — Detailed (600k users) only added it recently, and does it by issuing a **second HTTP GET** of the page, which can read different headers than the response you are actually looking at.

Same trick as 2b: one same-origin `fetch`, read `response.headers`. Catches header-delivered `noindex`, `nosnippet` (see 2a — this is how CDN configs silently kill AI visibility), `unavailable_after` dates already in the past, and `Link: rel="canonical"` headers that contradict the one in `<head>`.

**Effort:** small — you need the fetch for 2b anyway. **Differentiation:** high.

---

## 4. Flag dead schema types — ✅ shipped in v2.2.0

Google retired a pile of rich results, and huge numbers of WordPress/Yoast/RankMath sites still emit them:

| Type | Status |
|---|---|
| **FAQPage** | Stopped appearing **7 May 2026**; docs removed June 2026 |
| **HowTo** | Deprecated 2023 |
| Practice problem | Docs removed Jan 2026 |
| Course info, Estimated salary, Learning video, Vehicle listing, Special announcement | Removed Sept 2025 |
| Sitelinks searchbox | Deprecated Nov 2024 |
| ClaimReview / Book actions | Deprecation banner June 2025 |

Your `SD_OK` check already extracts `@type` from every JSON-LD block. This is a lookup table against a list you already have in hand.

Saying *"FAQPage detected — this rich result was retired on 7 May 2026 and produces no SERP feature"* is more useful than every validator that just says "valid," because validators check schema.org conformance, not Google feature eligibility.

While you are in there, the highest-value schema check nobody does: **markup that contradicts visible text.** Google's structured-data policy explicitly forbids marking up content not visible on the page, and price/rating mismatches are what draw manual actions. You have the JSON-LD parsed and `document.body.innerText` available — testing whether `name`, `offers.price` and `aggregateRating.ratingValue` actually appear on the page is cheap.

**Effort:** small. **Differentiation:** high, and it makes the tool feel current in a way version numbers cannot.

---

## 5. Turn a finding into something a developer can act on — ✅ shipped in v2.3.0

The verified #1 user need is egress, and there is a documented handoff problem behind it: an extension says `title too long`; a developer ticket needs the URL, current value, proposed value, the component responsible, and an acceptance criterion. That translation is 100% manual today and **no extension emits a ticket.**

You are further along here than any free competitor — you have the PDF and a text report. The gap is a third output aimed at developers rather than clients:

- Copy a single finding as a ready-to-paste ticket (URL, element selector — you already compute `cssPath()` — current value, expected value, why it matters, suggested fix)
- CSV export of findings, and of the images/links tables specifically (this is the concrete thing users ask for by name)
- A "copy all errors" button

You already store everything needed for this. It is mostly formatting.

**Effort:** small. **Differentiation:** medium on CSV (several competitors have it), high on the dev-ticket format (nobody does it).

**What shipping it actually took, for the next item's estimate:** the ticket and the findings
CSV were formatting on data already held, as predicted. The images/links CSVs were not — the
engine held *findings about* images and links but no inventory *of* them, so `report.tables`
is new (raw rows, capped at 1000, with the untruncated total kept). Two decisions worth
carrying forward: the findings CSV is **one row per element**, because joining selectors into
one cell repeats the truncation bug v2.2.1 removed from the panel; and every exported cell is
**neutralised against spreadsheet formula injection**, since a value lifted off the audited
page starting with `=` executes when the file is opened in Excel. Any future export inherits
that second obligation.

---

## 6. Core Web Vitals, measured honestly — ○ open, narrowed to INP and CLS

SEO Pro and Ahrefs Toolbar show CWV; most others do not. The metrics are still LCP, INP, CLS — nothing new since INP replaced FID in 2024, so anyone advertising a fourth Core Web Vital is wrong.

What makes this interesting for you specifically is that **LCP and CLS expose the offending element**: `LargestContentfulPaint.element` and `LayoutShiftAttribution.node`. You already have a highlight overlay system. Drawing a box around "this is your LCP element" and "this element caused your layout shift" is a natural extension of what SEO Lens already is, and no SEO extension does it.

Two honesty requirements: INP only exists if the user actually interacts, and a single visit is not field data — Google ranks on CrUX 75th percentile from real users. Say so in the UI; it prevents the "why does your number differ from PageSpeed" support load that competitors suffer.

**Effort:** medium. **Differentiation:** medium overall, high on the visual attribution.

**Overlap with item 8 — resolved in favour of 8.** LCP element identification appears in both,
and shipping the same `PerformanceObserver` twice would be silly. It belongs to 8, where it is
the entry point to a fix rather than a number on a dial: knowing the LCP element is only
interesting if the next click does something about it. **What is left here is INP and CLS.**
CLS keeps its own attribution work (`LayoutShiftAttribution.node`), which is genuinely separate
— a layout shift is usually not an image problem. Item 8 does not block item 6 and item 6 does
not block item 8; they share one helper and nothing else.

---

## 7. Accessibility, framed for the European Accessibility Act — ○ parked

Speculative, but with a real commercial hook. The EAA has been enforceable since **28 June 2025**, covering e-commerce, banking, e-books and transport across the EU. Businesses under 10 people are exempt; everyone above that is not. The standard is EN 301 549, whose draft v4.1.0 aligns with WCAG 2.2.

You already check two a11y items (iframe titles, form labels). Roughly eight more are simultaneously WCAG criteria and SEO concerns you partly cover: `lang`, descriptive `<title>`, single meaningful H1, no skipped headings, alt text, descriptive link text, colour contrast, and WCAG 2.2's new 24×24px target size.

The bridge that makes this credible rather than folklore: **Google's own Lighthouse now has an "agentic browsing" category containing an "accessibility for agents" audit** — accessible names, tree integrity, visibility — on the basis that AI agents navigate via the accessibility tree. That is a Google URL, not an SEO blog, and it is the honest version of "accessibility helps you get found." Google has never confirmed accessibility as a ranking factor; do not claim it does.

**Effort:** large if done properly. **Differentiation:** high, but it is a different product. Park it.

---

## 8. Image weight and LCP — measure the saving instead of estimating it — ○ open

Every performance tool in and around this category reports **estimated** savings and stops
there. Lighthouse says "properly size images — potential savings 412 KB" and hands the number
to a developer who then has to go and find out whether that is true. **Nobody closes the
loop.** The decision here is to close it: re-encode the flagged image in the browser, report
the bytes that actually came out, and hand the user the file.

That is a small feature with an unusually clean story, because it is the same move SEO Lens
already makes everywhere else — do not describe the defect, point at it — applied to bytes.

### 8a. Scope, and the thing this deliberately is not

**Scope: image weight and LCP.** Not page speed.

**Explicit non-goal: any overall "site speed score" or synthetic performance number.**
Lighthouse ships *inside* Chrome DevTools, is free, is run by the same team that defines the
metrics, and is two keystrokes away from every user of this extension. A second, worse number
sitting next to it in a panel invites exactly one question — "why does yours disagree with
Lighthouse?" — and every answer to that question costs credibility. This is recorded as a
non-goal rather than a "later" so it does not get reintroduced as a nice-to-have; if a future
version wants a speed number, the argument has to be made against this paragraph first.

The claim is narrow on purpose: *these specific images are heavier than they need to be, this
one is your LCP, and here is the smaller file.* Lighthouse does not hand back a file.

### 8b. Half of the detection already exists — read `audit.js` before adding anything

The image loop at `audit.js` (the `/* ---------- Images ---------- */` block, roughly lines
240–271) already walks every `doc.images` entry and already emits three of the six checks
proposed for this category. Adding them again would produce duplicate rows:

| Proposed check | State in the engine today |
|---|---|
| Overscale — `naturalWidth` vs rendered width | **Exists** as `IMG_OVERSIZED`, at `naturalWidth > width * 2`, no `devicePixelRatio` term |
| Missing `width`/`height` (CLS contributor) | **Exists** as `IMG_NO_DIM`, `warning`, `cat: "perf"` |
| `loading="lazy"` above the fold | **Inverse exists** as `IMG_NO_LAZY` (below-fold images *without* lazy). The `aboveFold()` helper is already there |
| LCP image identification | New |
| Missing modern format / no `srcset` | New |
| Missing `fetchpriority="high"` on the LCP image | New |

So the honest description of this item is **three new checks, one correction, and a fix step**
— not a new category built from nothing.

**The correction:** `IMG_OVERSIZED` should become `naturalWidth > renderedWidth *
devicePixelRatio * 1.5`. The current `* 2` with no DPR term is wrong in both directions — it
accuses correctly-authored 2× assets on a Retina screen, and it lets a genuinely bloated image
through on a DPR-1 screen. Note that this changes scores on pages that already audit clean, so
it is a CHANGELOG-visible behaviour change, and its `detailRaw` (today
`${naturalWidth}px → ${width}px`) needs the DPR in it or the finding reads as a false positive
to anyone on a Retina display.

### 8c. The six checks, in priority order

1. **LCP image identification.** `PerformanceObserver` on `largest-contentful-paint` with
   `buffered: true`, reported when `entry.element` is an `IMG`. This is the headline, not a
   list row — see the open question in 8h about what "headline" can mean given how
   `finalize()` orders findings.
2. **Overscale.** As corrected in 8b.
3. **Missing modern format** — not WebP or AVIF, and/or no `srcset`.
4. **Missing `fetchpriority="high"`** on the LCP image.
5. **Missing `width`/`height`.** Already shipped; listed for completeness only.
6. **`loading="lazy"` on above-the-fold images.** An anti-pattern that actively makes LCP
   worse, because the lazy image is skipped in the initial fetch queue. Most tools either
   ignore it or, worse, recommend lazy-loading everything. Catching it is cheap — it is the
   complement of the existing `noLazy` condition against the existing `aboveFold()` — and it
   is the check that shows the tool knows what it is talking about.

### 8d. The fix step, which is the actual differentiator

Each flagged image gets an **Optimize** action: re-encode at the rendered width the audit
already measured, show measured before/after bytes, offer the optimized file for download.

Fixed decisions:

- **100% client-side. No server, no backend, no upload.** The image never leaves the machine.
  This is not only a privacy position, it is the *only* position consistent with the "nothing
  leaves your browser" claim this document already recommends making, and a competitor with a
  backend cannot copy it without giving that claim up.
- **Encoder: the browser's own WebP encoder**, via
  `OffscreenCanvas.convertToBlob({ type: 'image/webp', quality })`, default **quality 0.82**.
  Zero bytes of dependency, already present in every Chromium build.
- **No WASM codec bundle now.** `@jsquash/webp` is the option to reach for *later*, and only
  if AVIF or true lossless turns out to matter; it costs several hundred KB of WASM in the
  package for an encoder the browser already has a version of. Revisit on evidence, not on
  principle.
- **Known limitations of the native path, to be documented in the UI rather than discovered by
  users:** it is lossy-only, there is no libwebp `method`/effort control, and it strips ICC and
  EXIF. For a "here is a smaller version of your hero image" workflow that is acceptable; for a
  photographer's colour-managed asset it is not, and the UI should say so.
- **Cross-origin images are read through `fetch(url)` → `blob()` → `createImageBitmap(blob)` →
  draw → encode**, never by pointing an `<img>` at the URL and drawing it. Drawing a
  cross-origin image taints the canvas and `convertToBlob()` then throws — the failure is
  silent-looking and would show up as "Optimize does nothing on half the web."
- **Encoding runs off the main thread via `OffscreenCanvas`, on demand, one image per user
  click. Never batch-encode every image on the page.** A 40-image gallery would lock the tab
  and, worse, would break hard rule 6 — the panel must never alter or degrade the page it is
  auditing. See 8h for where that worker can legally live.

**A drag-and-drop entry point into the same engine is acceptable as a second door, and must
not become the framing.** A generic drop-zone image converter competes head-on with Google's
Squoosh — open source, WASM, offline, free, better codecs, made by the Chrome team — and
loses that comparison on every axis. The defensible product is *"the auditor found this
specific image on this specific page and fixed it"*; the drop zone is a convenience for the
image the user already has in a folder, and it should be reachable but never on the front of
the box.

### 8e. Measurement risk — the one that can discredit the report

`performance.getEntriesByType('resource')` is the cheap way to get real transferred bytes and
it fails quietly in two very common cases:

- `encodedBodySize` is **0** for cross-origin resources whose response lacks a
  `Timing-Allow-Origin` header. Most CDN-hosted images.
- `transferSize` is **0** on a cache hit. Most repeat visits, which is most audits.

Both are normal, not exotic. The fallbacks are a background `fetch` for the real bytes — which
costs permissions and traffic, see 8f — or a pixel-count-based estimate, which is an estimate
and must be labelled as one.

**Hard requirement: when the size is unknown, the UI shows "unknown". Never "0 KB".** A single
confident zero next to a visibly large photograph tells the user the whole report is guessing,
and they are right to conclude that. Under hard rule 1 this is two message codes in `i18n.js`,
not a string assembled in the engine — the same split as the existing `A_STATS` / `A_STATS_NF`
pair.

### 8f. Permissions — and the one place this collides with v2.1

Reading real bytes for a **cross-origin** image needs host permissions. The decision is
`optional_host_permissions`, requested only on an explicit user action (the Optimize click),
never at install.

**This needs flagging honestly, because it touches the v2.1 hardening.** `manifest.json` today
declares exactly `activeTab`, `scripting`, `storage` — no `host_permissions` — and hard rule 2
in `CLAUDE.md` states the extension has none. `optional_host_permissions` does not produce an
install-time warning and grants nothing until the user says yes, so the *install* story is
unchanged; but the manifest would no longer be literally free of host permissions, and both
`README.md` and the Recommendation section of this document lean on that. See the open
questions in 8h. **The phasing in 8g is built so that this decision can be deferred rather than
made under pressure:** P0 and P1 need no permission change at all.

### 8g. Architecture fit, and phasing

Where it lands in the existing split:

| Piece | File | New or reused |
|---|---|---|
| DOM checks (overscale, format, `srcset`, `fetchpriority`, lazy-above-fold) | `audit.js`, inside the existing image loop | Reused — `isVisible()`, `aboveFold()`, `cssPath()`, `snippet()` all already do the work |
| LCP observation | `audit.js`, new async entry point alongside `__SEO_LENS_AUDIT_HEADERS__` | New, same shape as the header pass |
| Score / count / ordering recompute after the async finding lands | `finalize()` in `audit.js` | Reused, unchanged — this is exactly what it was split out for |
| All wording, both languages | the `M` table in `i18n.js`, via `issue()` / `fill()` | Reused |
| Panel rows, per-issue action button, highlight + scroll, highlight-all | `renderList()` / `highlightIssue()` / `highlightAll()` in `content.js` | Reused — the new **Optimize** button sits beside the existing `.sl-hl` button in the same detail block |
| PDF report | `renderFinding()` in `report.js` | Reused, no change — it renders any code generically |
| Encoding worker | new file | New, and its home is an open question (8h) |
| Injection list | `ensureInjected()` in `background.js` currently injects exactly `i18n.js`, `audit.js`, `content.js` | Changes only if the encoder becomes a fourth injected file |

**P0 — DOM-only. No bytes, no encoder, no manifest change.**
LCP image identified and outlined on the page; `fetchpriority` missing on it; `loading="lazy"`
above the fold; format and `srcset` gaps; the `IMG_OVERSIZED` DPR correction.

*Why the cut line is here:* the highlight system is the product. "This is your LCP image, and
it is lazy-loaded" is a **complete, actionable finding with no number attached** — the user
sees the box drawn round the hero image and knows what to do. It ships without touching the
permission model, without a worker, without a byte measurement that might read "unknown", and
without any of the decisions in 8f. If P1 never happens, P0 is still the only extension in the
category that outlines your LCP element.

*Effort:* small. The image loop already iterates every image with visibility and fold
information in hand; this is roughly a few dozen lines in `audit.js` plus six message codes ×
two languages in `i18n.js`. *Risk:* low. The one real risk is the `IMG_OVERSIZED` threshold
change moving scores on pages that previously audited clean — a CHANGELOG matter, not an
engineering one.

**P1 — measured weight and the Optimize action, same-origin images only.**
Same-origin images need no host permission, and `encodedBodySize` is populated for them without
a `Timing-Allow-Origin` header, so the whole measurement story works honestly inside the
existing permission model. Adds the encoder, the before/after readout, and the download.

*Effort:* medium. A new async pass, a new button and its state handling in `renderList()`, and
the `serializeReport()` change described in 8h. *Risk:* medium, concentrated in where the worker
is allowed to run — that is the question to answer before writing the encoder, not after.

**P2 — cross-origin bytes, platform-specific advice, drag-and-drop door.**
Gated on the `optional_host_permissions` decision in 8f. Platform detection belongs here
because it is near-free once the rest exists: read `meta[name=generator]`, look for
`wp-content` in image paths, look for `__NEXT_DATA__`, and turn "convert your images to WebP"
— which is not a fix, it is a category — into "install *this* plugin", "use `next/image`", or,
generically, "here is the optimized file, replace it". A recommendation a non-developer can
act on without a second search is the difference between a report that gets implemented and
one that gets forwarded.

*Effort:* medium, plus the policy decision. *Risk:* the highest of the three, and most of it is
positioning rather than code.

### 8h. Open questions — where the code contradicts the plan

These are places the existing architecture forces a different choice than the plan assumes.
None are blocking; all want a decision before implementation.

1. **"Headline finding" collides with `finalize()`.** `finalize()` sorts strictly by severity
   (`error` → `warning` → `info` → `stat` → `pass`). Being the LCP image is a *measurement*,
   not a defect, so under hard rule 5 it should be `stat` — which puts it near the bottom of
   the list, not the top. Making it a `warning` to force it upward would cost a clean page its
   100/100 for doing nothing wrong. The proposal is therefore: emit the LCP finding as `stat`
   and give it its own slot in the panel header next to the score, rather than trying to win
   the ordering. That is a panel-layout change, so it wants your agreement.
2. **The worker cannot obviously live where the plan puts it.** A content script creating a
   `Worker` from a `blob:` URL is subject to the **audited page's** CSP (`worker-src` /
   `child-src`), so it will fail on exactly the well-configured sites most likely to be
   audited. Loading it via `chrome.runtime.getURL()` instead requires adding
   `web_accessible_resources` to `manifest.json`, a surface this extension currently does not
   expose at all. The third option is to encode in the **service worker** (`background.js`):
   `OffscreenCanvas` and `createImageBitmap` are both available there, no page CSP applies, and
   it keeps the audited page untouched, which hard rule 6 wants anyway. **Recommendation:
   encode in `background.js`, message-passing the blob.** Needs your call.
3. **`serializeReport()` will silently drop the measured bytes.** It whitelists
   `code, severity, cat, params, detailRaw, count, paths` — anything else on a finding never
   reaches `report.js`. So before/after byte values must ride in `params` or `detailRaw`, or
   they will not appear in the PDF. Related and worse: the PDF payload is snapshotted when the
   report tab is opened, so an image optimized *after* that snapshot is not in the report.
   Either the Optimize action re-serializes, or the UI has to say the report reflects the
   audit and not the fixes.
4. **Hard rule 3 wording.** "Nothing leaves the browser" stays true — no analysis is uploaded
   and no image is transmitted anywhere — but P1/P2 do issue outbound requests for assets the
   page already loaded. That is a real change in network behaviour and the claim should be
   phrased as *nothing is uploaded, no account, no telemetry* rather than left to imply zero
   requests. Worth fixing in `README.md` at the same time, before someone else points it out.
5. **Rule 2 versus `optional_host_permissions`.** As set out in 8f — the *spirit* of the rule
   survives, the *letter* does not. If the "no host permissions at all" line is worth more than
   cross-origin byte accuracy, then P2 is simply not built and the cross-origin case shows
   "unknown" forever, which is honest and costs very little. This is a positioning call, not a
   technical one, and it is yours.
6. **LCP after a late injection.** The panel injects on toolbar click, often long after load,
   and `buffered: true` is what makes this work at all. It does mean the reported LCP belongs
   to the initial navigation — on an SPA that has since changed route, or a page the user has
   been scrolling for a minute, the entry may describe an element that is no longer the visual
   hero. Same honesty requirement as item 6: say it in the UI.

**Effort:** small (P0), medium (P1), medium (P2). **Differentiation:** high, and of an unusual
kind — the detection is commodity and the *fix* is not. Lighthouse, PageSpeed and every SEO
extension in the table above stop at an estimate; none of them hand back a file.

---

# Recommendation

> **Done.** 1, 3 and 4 shipped in v2.2.0 — see `CHANGELOG.md`. What follows is the original
> recommendation, kept intact because the reasoning behind the ordering still applies to what
> is left. One thing worth recording from the build: **1a turned out smaller than 1b and 1c,
> exactly as the honest weighting below predicted**, and the pixel budgets needed calibrating
> against the character guidance (60 English characters ≈ 540px, 160 ≈ 911px) rather than being
> taken on faith.
>
> **Where item 8 sits:** after 5 (now shipped), before 6. It is behind 5 because 5 is pure formatting on data
> already held and finishes the most-requested feature in the category, and because 5's images
> CSV gains a weight column for free once 8 exists. It is ahead of 6 because 8's P0 is smaller
> than 6, because it takes 6's most interesting half with it, and because 8 ends in a fix while
> 6 ends in a number. **Order from here: 2b/2c → 8 → 6 → 7.**

**Build 1, 3 and 4 first.** All three are small, all three fix real defects, and together they give you a release with a story: *the only page auditor that measures Persian and Arabic correctly, catches `noindex` delivered by header, and knows which rich results Google retired.*

**Then 2 and 5.** The `fetch` you add for #3 gives you #2b almost for free, and #5 is formatting work on data you already hold.

**Keep doing the thing nobody else does.** Every competitor either lists issues in a panel or highlights nofollow links. Your on-page defect marking is the product; treat new checks as things to *highlight*, not things to list. The two extensions that share your approach have 70 users between them — the idea is unclaimed, not disproven.

**Two assets you already have and should say out loud:** after v2.1 your permission model (`activeTab` + `scripting`, no host permissions) matches SEO META in 1 Click's — the cleanest in the category — which lets you make a "nothing leaves your browser" claim that Semrush, Ahrefs, Moz, Surfer and Keywords Everywhere structurally cannot. And your PDF report already beats every free competitor on the most-requested feature in the category.

---

## One honest caveat

The RTL opportunity is a **verified defect with unverified demand**. I confirmed at source level that no competitor handles it, but I found no user complaints about it either — most likely because Persian and Arabic SEO practitioners never expected these tools to work and quietly route around them. That absence is consistent with an unserved market, but it is not the same as proven demand. Before betting heavily on it, talk to a handful of Persian-language SEO practitioners. You are unusually well placed to do exactly that.

---

## Sources

Google: [AI features](https://developers.google.com/search/docs/appearance/ai-features) · [AI optimization guide](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide) · [Robots meta / X-Robots-Tag](https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag) · [JavaScript SEO basics](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics) · [Structured data policies](https://developers.google.com/search/docs/appearance/structured-data/sd-policies) · [Search gallery](https://developers.google.com/search/docs/appearance/structured-data/search-gallery) · [Documentation updates](https://developers.google.com/search/updates) · [Lighthouse agentic browsing](https://developer.chrome.com/docs/lighthouse/agentic-browsing/scoring) · [web.dev Web Vitals](https://web.dev/articles/vitals)

Images and encoding: [web.dev — optimize LCP](https://web.dev/articles/optimize-lcp) · [web.dev — fetchpriority](https://web.dev/articles/fetch-priority) · [MDN — OffscreenCanvas.convertToBlob](https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas/convertToBlob) · [MDN — encodedBodySize](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceResourceTiming/encodedBodySize) · [MDN — Timing-Allow-Origin](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Timing-Allow-Origin) · [Squoosh](https://github.com/GoogleChromeLabs/squoosh) · [jSquash](https://github.com/jamsinclair/jSquash)

Crawler docs: [OpenAI bots](https://developers.openai.com/api/docs/bots) · [Anthropic crawler](https://support.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler) · [Perplexity bots](https://docs.perplexity.ai/guides/bots)

Studies: [Vercel — AI crawlers don't render JS](https://vercel.com/blog/the-rise-of-the-ai-crawler) · [Ahrefs — AI brand visibility correlations](https://ahrefs.com/blog/ai-brand-visibility-correlations) · [Zyppy — AI citation factors meta-analysis](https://signal.zyppy.com/p/ai-citation-ranking-factors)

Competitors: [SEOquake reviews](https://chrome-stats.com/d/akdgnmcogleenhbclghghlkkdndkjdjc/reviews) · [SEO Minion reviews](https://chromewebstore.google.com/detail/seo-minion/giihipjfimkajhlcilipnjeohabimjhi/reviews) · [SEO Minion pricing](https://keywordseverywhere.com/seominion/pricing) · [META SEO Inspector reviews](https://chrome-stats.com/d/ibkclpciafdglkjkcibmohobjkcfkaef/reviews) · [Detailed SEO](https://detailed.com/extension/) · [Detailed changelog](https://detailed.com/updated/) · [SEO META in 1 Click](https://chrome-stats.com/d/bjogjfinolnhfhkbipphpdlldadpnmhc) · [Visual SEO Audit](https://chromewebstore.google.com/detail/visual-seo-audit-%E2%80%93-on-pag/deknpinnpnjceljenoaoelhnhobkfcef)

Regulatory: [Directive (EU) 2019/882](https://eur-lex.europa.eu/eli/dir/2019/882/oj) · [EN 301 549 v4.1.0 draft](https://www.etsi.org/deliver/etsi_en/301500_301599/301549/04.01.00_20/en_301549v040100ev.pdf)

Workflow: [Growth Rocket — agency audits](https://www.growth-rocket.com/blog/what-no-one-tells-agencies-about-technical-seo-audits/) · [SEJ — why SEO work isn't implemented](https://www.searchenginejournal.com/why-your-seo-work-isnt-getting-implemented-the-it-line-of-death/573255/)
