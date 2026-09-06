## v2.3.0

Gap-analysis item 5: developer hand-off. The verified number-one request across every
competing extension's review corpus is not more checks — it is getting the findings *out*.
The PDF report was already the client-facing exit; this release adds the developer-facing one.

### A finding can be pasted into a tracker

- Every finding now has a **Copy as ticket** button next to *Show on page*. The ticket carries
  the page URL, the severity, the category, the issue code, every affected element with its
  selector and its text, the current value, why it matters, the suggested fix — and an
  acceptance criterion. Passing checks and neutral stats have no button; they are not tickets.
- The acceptance criterion is deliberately generic: *a fresh audit of this URL no longer
  reports `CODE`*. It is verifiable with the same tool that raised the finding, which is the
  difference between a ticket that gets closed and a ticket that gets argued about. No
  competitor in the category emits a ticket format at all.
- **Copy all errors** does the same for every error on the page in one clipboard write.

### CSV export

- **Findings CSV** — one row per *element*, not per finding, so a finding covering 23 images
  is 23 sortable rows and nothing has to be crushed into one cell. Columns: severity, category,
  code, issue, detail, fix, element count, element path, element text, page URL.
- **Images CSV** and **Links CSV** — the two tables users ask for by name. The engine now keeps
  an inventory of every image (src, alt, whether alt exists at all, rendered and natural size,
  `loading`, visibility, above-the-fold) and every link (href resolved to absolute, text, scope,
  `rel`, `target`, nofollow, visibility), each with its selector. Both are capped at 1000 rows
  and the untruncated total is kept, so a huge page says it was capped instead of quietly
  shipping a short file.
- **Cells that a spreadsheet would execute are neutralised.** A value lifted off the audited
  page starting with `=`, `+`, `-` or `@` is a formula to Excel; every such cell is prefixed so
  it stays text. This is the same principle as the bidi isolation added in v2.2 — data taken
  off a page is never trusted by the surface that displays it.
- Files are written with a UTF-8 BOM, without which Excel opens a Persian CSV as mojibake.
  The download anchor is created inside the panel's own shadow root, so the audited document
  is still never touched.

### Everything else

- All new wording lives in `i18n.js` in both languages, including the CSV column headers and
  the `internal` / `external` scope labels; the engine emits raw values and tokens only.
- The report payload and the PDF are unchanged — the inventories are export-only and never
  enter `serializeReport()`.
- `test/` gains an `assets.html` fixture and nineteen assertions covering the inventories, all
  three CSVs, the formula-injection guard, the ticket format and copy-all-errors. The clean
  fixture still scores exactly 100.

