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

