# Verification harness

There is no unit-test suite: SEO Lens is a DOM auditor, so the only verification worth
trusting drives a real browser against real pages. This is that, made repeatable.

```bash
cd test
npm install
# a self-signed cert, because location.protocol drives the HTTPS/mixed-content checks
openssl req -x509 -newkey rsa:2048 -keyout key.pem -out cert.pem -days 30 -nodes \
  -subj "/CN=localhost" -addext "subjectAltName=DNS:localhost"
npm test        # engine assertions + panel screenshots
npm run report  # renders report.html in both languages and screenshots it
```

`run.js` exits non-zero on the first failed assertion, so it works in CI.

## What it covers

| Fixture | Proves |
|---|---|
| `clean.html` | A page with nothing wrong still scores exactly **100**. This is the invariant that broke in v2.0 and it is checked first. |
| `rtl-broken.html` | `lang="fa"` with `dir="ltr"`, unisolated Latin runs inside Persian headings, and a Persian title that overflows 580px while looking fine by character count. |
| `rtl-good.html` | The mirror image — a correctly declared RTL page must produce **no** direction findings, and `<bdi>`-wrapped Latin runs must not be flagged. |
| `headers.html` | `X-Robots-Tag: noindex` is invisible to the synchronous audit and caught by the header pass; the score drops accordingly. Also `nosnippet`, an expired `unavailable_after`, and a `Link:` canonical that contradicts `<head>`. |
| `headers-otherbot.html` | A directive scoped to a bot we do not report on is ignored rather than mis-reported. |
| `headers-ok.html` | `max-snippet:-1` is not read as a restriction. |
| `schema.html` | Retired `FAQPage` and `HowTo`, deprecated sitelinks searchbox, and a JSON-LD price that appears nowhere on the page — while a rating that *is* on the page stays unflagged. |
| `robots.txt` + `ai-blocked.html` | The AI crawler matrix: a multi-agent group, a `*` wildcard rule and a `$`-anchored one, and the split between search crawlers (a warning) and training crawlers (a `stat` that costs nothing). One path-scoped `robots.txt` serves the whole origin, so `clean.html` stays genuinely unblocked. |
| `private/page.html`, `private/public.html` | A URL disallowed for Googlebot is an error; an agent with no group of its own falls back to `*` while one with a group ignores `*` entirely; a longer `Allow` beats the folder `Disallow`. |
| `:8444`, `:8445` | robots.txt is per-origin, so the two degenerate responses get their own servers: `/robots.txt` answering with HTML, and `/robots.txt` answering 503. |
| `assets.html` | The developer hand-off: the image and link inventories, all three CSVs, the ticket format and copy-all-errors. Its first image carries an `alt` shaped like a spreadsheet formula, so the export's injection guard is exercised on every run rather than trusted. |

The export assertions drive the real panel — a click on the export menu, a real download
event, and a stubbed `navigator.clipboard` whose argument is read back — rather than calling
the builders directly, because the thing that breaks is the wiring, not the string joining.

Both panel screenshots and both report screenshots are written next to the harness, plus
`panel-export.png`. Look at them; the RTL ones are where layout regressions actually show up.
