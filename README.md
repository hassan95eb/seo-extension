# SEO Lens

A Chrome extension that audits any page for SEO issues and **outlines the exact broken element on the page**.

Most SEO extensions hand you a list. This one shows you *where* — click an issue and the page scrolls to the offending element and draws a labelled box around it.

## Install (unpacked)

1. Clone or download this repository.
2. Open `chrome://extensions`.
3. Enable **Developer mode** (top right).
4. Click **Load unpacked** and select the project folder.
5. Pin the purple lens icon to your toolbar.

## Usage

- Click the icon on any page — the audit panel opens on the right.
- Click any issue — the page scrolls to that element and outlines it with a colour-coded box and label.
- **Highlight all issues** — outlines and numbers every problem element at once.
- **Copy report** — puts the full report on the clipboard as plain text, ready to paste into a ticket.
- The toolbar badge shows the number of errors + warnings for the current tab.
- `Esc` closes the panel. The panel header is draggable.

## What it checks

| Group | Checks |
|---|---|
| **Core tags** | title and meta description — presence, length, duplicates |
| **Content structure** | missing / multiple / hidden / empty H1, heading level skips, empty headings, word count |
| **Images** | missing alt, empty alt on content images, overly long alt, generic filenames |
| **Performance** | missing width/height (CLS), images served larger than displayed, missing lazy-load, render-blocking scripts |
| **Links** | empty anchor text, generic anchors, `href="#"`, `<a>` without href, `target="_blank"` without `noopener`, nofollowed internal links, internal/external counts |
| **Indexability** | canonical (missing / duplicate / empty / pointing elsewhere), noindex, page-level nofollow, `lang`, non-self-referencing hreflang |
| **Social** | Open Graph completeness, `twitter:card` |
| **Structured data** | JSON-LD / microdata presence, malformed JSON, detected schema types |
| **Technical** | viewport, disabled zoom, charset, favicon, HTTPS, mixed content, URL shape |
| **Accessibility** | iframes without a title, form fields without labels |

## Scoring

Starts at 100: −9 per error, −4 per warning, −1 per notice.

## Notes

- Chrome blocks extensions on its own internal pages (`chrome://`, the Web Store), so the panel won't open there.
- For `file://` pages, enable "Allow access to file URLs" in the extension's settings.
- Everything runs client-side. No data is sent anywhere.

---

## Author

**hassan mode : on**

Built by [hassan95eb](https://github.com/hassan95eb) — [github.com/hassan95eb/seo-extension](https://github.com/hassan95eb/seo-extension)

## License

MIT © hassan95eb
