# Changelog

## v2.1.0

Hardening pass over v2.0. No features removed. Every item below has a verification
recipe in the README, under "v2.1 — what changed and how to check it".

### Permissions
- Removed the `content_scripts` block and `host_permissions: <all_urls>`. Nothing runs on any
  page until the toolbar icon is clicked; injection goes through `chrome.scripting` under
  `activeTab`, so Chrome no longer shows the "read and change all your data on all websites"
  warning at install.
- Dropped `web_accessible_resources` — the report page is an extension page and never needed it.
- `isInjectable()` rewritten as an explicit allow-list; the previous scheme loop was unreachable.

### Scoring
- New `stat` severity for neutral measurements. The link-count summary used to be emitted as an
  `info`, which silently cost every page one point and inflated the notice counter — no page
  could score above 99. Stats are now excluded from the score and counted separately under
  `counts.stats`.

### Privacy
- Report payloads are written under a unique key, sweep older payloads first, and are deleted
  from `chrome.storage.local` as soon as the report page has read them. A per-tab
  `sessionStorage` copy keeps the report alive across a refresh and disappears with the tab.
- Favicon URLs taken from the audited page are validated before reaching the report DOM; only
  `http:`, `https:` and `data:image/…` are accepted.

### Consistency
- Panel and report now share one language-detection path, and the detected language is persisted
  on first run. Previously the report page fell back to Persian regardless of the panel.
- Removed the last display strings from the engine: the Persian `console.warn` in
  `background.js`, and the `" · N nofollow"` suffix that `audit.js` assembled itself — now the
  separate `A_STATS_NF` message code, with the wording owned by `i18n.js`.

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
