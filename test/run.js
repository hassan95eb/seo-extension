/* Drives real Chromium against the fixtures, injects i18n.js + audit.js, and asserts on
 * the codes the engine emits. There is no test suite in the repo; this is the recipe
 * CLAUDE.md describes, extended to cover the v2.2 checks.
 */
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");
const { start } = require("./server");

const REPO = process.env.REPO || path.join(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(REPO, f), "utf8");

let failures = 0;
function check(name, ok, detail) {
  console.log(`${ok ? "  ok  " : "  FAIL"}  ${name}${detail ? "   " + detail : ""}`);
  if (!ok) failures++;
}

async function auditPage(page, url, wantHeaders) {
  await page.goto(url, { waitUntil: "load" });
  await page.addScriptTag({ content: read("i18n.js") });
  await page.addScriptTag({ content: read("audit.js") });
  return page.evaluate(async (withHeaders) => {
    const r = window.__SEO_LENS_AUDIT__();
    if (withHeaders) await window.__SEO_LENS_AUDIT_HEADERS__(r);
    return {
      score: r.score,
      counts: r.counts,
      issues: r.issues.map((i) => ({
        code: i.code, severity: i.severity, params: i.params, detailRaw: i.detailRaw, count: i.count
      }))
    };
  }, wantHeaders);
}

const codes = (r) => r.issues.map((i) => i.code);
const find = (r, c) => r.issues.find((i) => i.code === c);

(async () => {
  const server = await start(
    fs.readFileSync(path.join(__dirname, "cert.pem")),
    fs.readFileSync(path.join(__dirname, "key.pem")),
    8443
  );
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
  const ctx = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const B = "https://localhost:8443";

  /* ---- 1. the clean page still scores exactly 100 ---- */
  console.log("\nclean.html");
  let r = await auditPage(page, `${B}/clean.html`, true);
  check("scores 100", r.score === 100, `got ${r.score} — ${r.issues.filter((i) => ["error", "warning", "info"].includes(i.severity)).map((i) => i.code).join(", ") || "no findings"}`);
  check("no direction finding on an LTR page", !codes(r).some((c) => c.startsWith("DIR_") || c === "BIDI_UNISOLATED"));
  check("no header finding when no X-Robots-Tag", !codes(r).some((c) => c.startsWith("HDR_")));
  check("title reports pixels", find(r, "TITLE_OK") && find(r, "TITLE_OK").params.px > 0,
    find(r, "TITLE_OK") ? `${find(r, "TITLE_OK").params.n} chars / ${find(r, "TITLE_OK").params.px}px` : "");

  /* ---- 2. RTL defects ---- */
  console.log("\nrtl-broken.html");
  r = await auditPage(page, `${B}/rtl-broken.html`, true);
  check('lang="fa" + dir="ltr" is an error', find(r, "DIR_CONFLICT") && find(r, "DIR_CONFLICT").severity === "error");
  check("unisolated bidi runs are flagged", !!find(r, "BIDI_UNISOLATED"),
    find(r, "BIDI_UNISOLATED") ? `${find(r, "BIDI_UNISOLATED").count} elements` : "");
  check("bidi finding is highlightable on the page", !!find(r, "BIDI_UNISOLATED") && find(r, "BIDI_UNISOLATED").count > 0);
  const tpx = find(r, "TITLE_PX_LONG");
  check("long Persian title caught by pixel width", !!tpx,
    tpx ? `${tpx.params.n} chars / ${tpx.params.px}px of ${tpx.params.max}` : "");

  console.log("\nrtl-good.html");
  r = await auditPage(page, `${B}/rtl-good.html`, true);
  check('dir="rtl" on a Persian page passes', !!find(r, "DIR_OK"));
  check("no direction warnings", !codes(r).some((c) => ["DIR_MISSING", "DIR_ON_BODY", "DIR_CONFLICT", "DIR_RTL_LTR_CONTENT"].includes(c)));
  check("isolated Latin runs are not flagged", !find(r, "BIDI_UNISOLATED"));

  /* ---- 3. X-Robots-Tag ---- */
  console.log("\nheaders.html");
  const before = await auditPage(page, `${B}/headers.html`, false);
  check("synchronous pass sees nothing (this is the whole point)", !codes(before).some((c) => c.startsWith("HDR_")));
  r = await auditPage(page, `${B}/headers.html`, true);
  check("header noindex found", !!find(r, "HDR_NOINDEX") && find(r, "HDR_NOINDEX").severity === "error");
  check("header nosnippet found", !!find(r, "HDR_NOSNIPPET"));
  check("expired unavailable_after found", !!find(r, "HDR_EXPIRED"));
  check("conflicting Link canonical found", !!find(r, "HDR_CANON_CONFLICT"));
  check("score drops after the header pass", r.score < before.score, `${before.score} → ${r.score}`);

  console.log("\nheaders-otherbot.html");
  r = await auditPage(page, `${B}/headers-otherbot.html`, true);
  check("directive scoped to another bot is ignored", !find(r, "HDR_NOINDEX"));

  console.log("\nheaders-ok.html");
  r = await auditPage(page, `${B}/headers-ok.html`, true);
  check("benign X-Robots-Tag passes", !!find(r, "HDR_ROBOTS_OK"));
  check("max-snippet:-1 is not read as a restriction", !find(r, "HDR_NOSNIPPET"));

  /* ---- 4. dead schema ---- */
  console.log("\nschema.html");
  r = await auditPage(page, `${B}/schema.html`, true);
  const faq = r.issues.find((i) => i.code === "SD_RETIRED" && i.params.type === "FAQPage");
  const howto = r.issues.find((i) => i.code === "SD_RETIRED" && i.params.type === "HowTo");
  check("FAQPage flagged as retired", !!faq, faq ? faq.params.date : "");
  check("HowTo flagged as retired", !!howto, howto ? howto.params.date : "");
  check("sitelinks searchbox flagged", !!find(r, "SD_SEARCHBOX"));
  const inv = find(r, "SD_INVISIBLE");
  check("price absent from the page is flagged", !!inv, inv ? inv.detailRaw : "");
  check("rating that IS on the page is not flagged", !!inv && inv.detailRaw.indexOf("4.8") === -1, inv ? inv.detailRaw : "");
  check("SD_OK still lists the types", !!find(r, "SD_OK"), find(r, "SD_OK") ? find(r, "SD_OK").detailRaw : "");

  /* ---- 5. panel renders, both languages ---- */
  console.log("\npanel");
  for (const [url, lang, name] of [[`${B}/rtl-broken.html`, "fa", "panel-fa"], [`${B}/schema.html`, "en", "panel-en"]]) {
    await page.goto(url, { waitUntil: "load" });
    await page.addScriptTag({ content: read("i18n.js") });
    await page.addScriptTag({ content: read("audit.js") });
    await page.evaluate((l) => {
      const store = { seoLensLang: l };
      window.chrome = {
        storage: { local: {
          get: (k, cb) => cb(store),
          set: (o, cb) => { Object.assign(store, o); cb && cb(); },
          remove: (k, cb) => { cb && cb(); }
        } },
        runtime: {
          sendMessage: () => {},
          onMessage: { addListener: (fn) => { window.__listener = fn; } }
        }
      };
    }, lang);
    await page.addScriptTag({ content: read("content.js") });
    await page.evaluate(() => window.__listener({ type: "SEO_LENS_TOGGLE" }, {}, () => {}));
    await page.waitForTimeout(1200);
    const shot = path.join(__dirname, name + ".png");
    await page.screenshot({ path: shot });
    const rendered = await page.evaluate(() => {
      const hostEl = Array.from(document.documentElement.children).find((e) => e.id && e.id.indexOf("seo-lens-root-") === 0 && e.shadowRoot && e.shadowRoot.querySelector("#sl-panel"));
      if (!hostEl) return null;
      const sh = hostEl.shadowRoot;
      return {
        score: sh.querySelector("#sl-score").textContent,
        dir: sh.querySelector("#sl-panel").getAttribute("dir"),
        items: sh.querySelectorAll(".sl-item").length,
        firstTitle: sh.querySelector(".sl-title") ? sh.querySelector(".sl-title").textContent : ""
      };
    });
    check(`${name} panel renders`, !!rendered && rendered.items > 0, rendered ? `dir=${rendered.dir} score=${rendered.score} items=${rendered.items} · ${rendered.firstTitle}` : "no panel");
    console.log(`        screenshot: ${shot}`);
  }

  await browser.close();
  server.close();
  console.log(`\n${failures ? failures + " FAILURES" : "all checks passed"}`);
  process.exit(failures ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
