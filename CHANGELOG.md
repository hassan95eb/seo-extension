# Changelog

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
