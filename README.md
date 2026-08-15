# SEO Lens

[![hassan mode : on](https://img.shields.io/badge/hassan%20mode-on-7c3aed?style=flat-square)](https://github.com/hassan95eb)
[![license](https://img.shields.io/badge/license-MIT-16a34a?style=flat-square)](LICENSE)
[![manifest](https://img.shields.io/badge/manifest-v3-0e7490?style=flat-square)](manifest.json)

A Chrome extension that audits any page for 40+ SEO issues, **outlines the exact broken element on the page**, and exports a branded PDF report. Bilingual: English and Persian.

Most SEO extensions hand you a list. This one shows you *where* — click an issue and the page scrolls to the offending element and draws a labelled box around it.

> 🇮🇷 [نسخه فارسی این راهنما](README.fa.md)

![Audit panel with on-page highlighting](docs/panel-en.png)

## Install

**From a release:** download the latest ZIP from [Releases](../../releases) and unzip it.
**From source:** clone this repository.

Then:

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** and select the folder
4. Pin the purple lens icon to your toolbar

## Usage

- Click the icon on any page — the audit panel opens.
- Click any issue — the page scrolls to that element and outlines it with a colour-coded box and label.
- **Highlight all issues** — outlines and numbers every problem element at once.
- **PDF report** — opens a print-ready report tab; hit "Save as PDF / Print" and choose **Save as PDF** as the destination.
- **Copy report** — plain-text report on the clipboard, ready for a ticket.
- The **EN / فا** button switches language; your choice is remembered.
- `Esc` closes the panel. The panel header is draggable.

## PDF report

![Sample PDF report](docs/report-fa.png)

- Header carries the **logo, site name, page URL and date** (Persian calendar when the report language is Persian).
- The logo is pulled automatically from the site's favicon or apple-touch-icon.
- **Choose custom logo** lets you drop in your own agency logo — it's stored and reused on every later report, which makes the output usable as a white-label client deliverable.
- A4 layout, embedded Vazirmatn font, print-safe colours, clean page breaks.
- Report language can be switched right on the report page.

## What it checks

| Group | Checks |
|---|---|
| **Core tags** | title and meta description — presence, length, duplicates |
| **Content structure** | missing / multiple / hidden / empty H1, heading level skips, empty headings, word count |
| **Images** | missing alt, empty alt on content images, overly long alt, generic filenames |
| **Performance** | missing width/height (CLS), images served larger than displayed, missing lazy-load, render-blocking scripts |
| **Links** | empty anchor text, generic anchors, `href="#"`, `<a>` without href, `target="_blank"` without `noopener`, nofollowed internal links, no internal links, link counts |
| **Indexability** | canonical (missing / duplicate / empty / pointing elsewhere), noindex, page-level nofollow, `lang`, non-self-referencing hreflang |
| **Social** | Open Graph completeness, `twitter:card` |
| **Structured data** | JSON-LD / microdata presence, malformed JSON, detected schema types |
| **Technical** | viewport, disabled zoom, charset, favicon, HTTPS, mixed content, URL shape |
| **Accessibility** | iframes without a title, form fields without labels |

## Scoring

Starts at 100: −9 per error, −4 per warning, −1 per notice.

## Project layout

```
manifest.json          extension config (MV3)
background.js          service worker — panel toggle, badge, report tab
i18n.js                full string catalogue for both languages (the only file to touch for a new language)
audit.js               audit engine — language-agnostic, emits code + params only
content.js             panel, highlight system, exports
report.html/.css/.js   print-ready report page
fonts/                 Vazirmatn (Regular + Bold) for the PDF output
_locales/              store name and description (en + fa)
```

Adding a third language means adding one key to `i18n.js` — nothing else changes.

## Notes

- Chrome blocks extensions on its own internal pages (`chrome://`, the Web Store), so the panel won't open there.
- For `file://` pages, enable "Allow access to file URLs" in the extension's settings.
- Everything runs client-side. No data is sent anywhere.

---

## Author

**hassan mode : on**

The signature sits in three places on the extension itself: the panel footer, the PDF report footer, and the end of the copied text report.

Built by [hassan95eb](https://github.com/hassan95eb) — [github.com/hassan95eb/seo-extension](https://github.com/hassan95eb/seo-extension)

## License

MIT © hassan95eb
