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

---

## 1. Make the checks correct for Persian and Arabic content

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

## 2. AI visibility — but only the parts that are actually documented

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

## 3. `X-Robots-Tag` — a whole class of invisible killers

`noindex` delivered as an HTTP header does not appear in the DOM. SEO Lens does not check it. Neither do most competitors — Detailed (600k users) only added it recently, and does it by issuing a **second HTTP GET** of the page, which can read different headers than the response you are actually looking at.

Same trick as 2b: one same-origin `fetch`, read `response.headers`. Catches header-delivered `noindex`, `nosnippet` (see 2a — this is how CDN configs silently kill AI visibility), `unavailable_after` dates already in the past, and `Link: rel="canonical"` headers that contradict the one in `<head>`.

**Effort:** small — you need the fetch for 2b anyway. **Differentiation:** high.

---

## 4. Flag dead schema types

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

## 5. Turn a finding into something a developer can act on

The verified #1 user need is egress, and there is a documented handoff problem behind it: an extension says `title too long`; a developer ticket needs the URL, current value, proposed value, the component responsible, and an acceptance criterion. That translation is 100% manual today and **no extension emits a ticket.**

You are further along here than any free competitor — you have the PDF and a text report. The gap is a third output aimed at developers rather than clients:

- Copy a single finding as a ready-to-paste ticket (URL, element selector — you already compute `cssPath()` — current value, expected value, why it matters, suggested fix)
- CSV export of findings, and of the images/links tables specifically (this is the concrete thing users ask for by name)
- A "copy all errors" button

You already store everything needed for this. It is mostly formatting.

**Effort:** small. **Differentiation:** medium on CSV (several competitors have it), high on the dev-ticket format (nobody does it).

---

## 6. Core Web Vitals, measured honestly

SEO Pro and Ahrefs Toolbar show CWV; most others do not. The metrics are still LCP, INP, CLS — nothing new since INP replaced FID in 2024, so anyone advertising a fourth Core Web Vital is wrong.

What makes this interesting for you specifically is that **LCP and CLS expose the offending element**: `LargestContentfulPaint.element` and `LayoutShiftAttribution.node`. You already have a highlight overlay system. Drawing a box around "this is your LCP element" and "this element caused your layout shift" is a natural extension of what SEO Lens already is, and no SEO extension does it.

Two honesty requirements: INP only exists if the user actually interacts, and a single visit is not field data — Google ranks on CrUX 75th percentile from real users. Say so in the UI; it prevents the "why does your number differ from PageSpeed" support load that competitors suffer.

**Effort:** medium. **Differentiation:** medium overall, high on the visual attribution.

---

## 7. Accessibility, framed for the European Accessibility Act

Speculative, but with a real commercial hook. The EAA has been enforceable since **28 June 2025**, covering e-commerce, banking, e-books and transport across the EU. Businesses under 10 people are exempt; everyone above that is not. The standard is EN 301 549, whose draft v4.1.0 aligns with WCAG 2.2.

You already check two a11y items (iframe titles, form labels). Roughly eight more are simultaneously WCAG criteria and SEO concerns you partly cover: `lang`, descriptive `<title>`, single meaningful H1, no skipped headings, alt text, descriptive link text, colour contrast, and WCAG 2.2's new 24×24px target size.

The bridge that makes this credible rather than folklore: **Google's own Lighthouse now has an "agentic browsing" category containing an "accessibility for agents" audit** — accessible names, tree integrity, visibility — on the basis that AI agents navigate via the accessibility tree. That is a Google URL, not an SEO blog, and it is the honest version of "accessibility helps you get found." Google has never confirmed accessibility as a ranking factor; do not claim it does.

**Effort:** large if done properly. **Differentiation:** high, but it is a different product. Park it.

---

# Recommendation

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

Crawler docs: [OpenAI bots](https://developers.openai.com/api/docs/bots) · [Anthropic crawler](https://support.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler) · [Perplexity bots](https://docs.perplexity.ai/guides/bots)

Studies: [Vercel — AI crawlers don't render JS](https://vercel.com/blog/the-rise-of-the-ai-crawler) · [Ahrefs — AI brand visibility correlations](https://ahrefs.com/blog/ai-brand-visibility-correlations) · [Zyppy — AI citation factors meta-analysis](https://signal.zyppy.com/p/ai-citation-ranking-factors)

Competitors: [SEOquake reviews](https://chrome-stats.com/d/akdgnmcogleenhbclghghlkkdndkjdjc/reviews) · [SEO Minion reviews](https://chromewebstore.google.com/detail/seo-minion/giihipjfimkajhlcilipnjeohabimjhi/reviews) · [SEO Minion pricing](https://keywordseverywhere.com/seominion/pricing) · [META SEO Inspector reviews](https://chrome-stats.com/d/ibkclpciafdglkjkcibmohobjkcfkaef/reviews) · [Detailed SEO](https://detailed.com/extension/) · [Detailed changelog](https://detailed.com/updated/) · [SEO META in 1 Click](https://chrome-stats.com/d/bjogjfinolnhfhkbipphpdlldadpnmhc) · [Visual SEO Audit](https://chromewebstore.google.com/detail/visual-seo-audit-%E2%80%93-on-pag/deknpinnpnjceljenoaoelhnhobkfcef)

Regulatory: [Directive (EU) 2019/882](https://eur-lex.europa.eu/eli/dir/2019/882/oj) · [EN 301 549 v4.1.0 draft](https://www.etsi.org/deliver/etsi_en/301500_301599/301549/04.01.00_20/en_301549v040100ev.pdf)

Workflow: [Growth Rocket — agency audits](https://www.growth-rocket.com/blog/what-no-one-tells-agencies-about-technical-seo-audits/) · [SEJ — why SEO work isn't implemented](https://www.searchenginejournal.com/why-your-seo-work-isnt-getting-implemented-the-it-line-of-death/573255/)
