/* Drives real Chromium against the fixtures, injects i18n.js + audit.js, and asserts on
 * the codes the engine emits. There is no test suite in the repo; this is the recipe
 * CLAUDE.md describes, extended to cover the v2.2 checks.
 */
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");
const { start, HTML_ROBOTS_ROUTES, ERR_ROBOTS_ROUTES, CROSS_ORIGIN_ROUTES } = require("./server");
const { THUMB_PNG, PHOTO_PNG } = require("./fixtures");

const REPO = process.env.REPO || path.join(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(REPO, f), "utf8");

let failures = 0;
function check(name, ok, detail) {
  console.log(`${ok ? "  ok  " : "  FAIL"}  ${name}${detail ? "   " + detail : ""}`);
  if (!ok) failures++;
}

// `withAsync` runs both asynchronous passes — headers/raw HTML and LCP — the way the panel
// does. Called with false it asserts on the synchronous first paint alone, which is how the
// LCP de-duplication is shown to actually remove something. `wantWeight` chains the item 8
// phase P1 pass after LCP, the same order runLcpAudit() uses in content.js and for the same
// reason: LCP_IMG has to exist before the weight pass can find it among OPTIMIZABLE_CODES.
async function auditPage(page, url, wantHeaders, wantWeight) {
  await page.goto(url, { waitUntil: "load" });
  await page.addScriptTag({ content: read("i18n.js") });
  await page.addScriptTag({ content: read("audit.js") });
  return page.evaluate(async ({ withHeaders, withWeight }) => {
    const r = window.__SEO_LENS_AUDIT__();
    if (withHeaders) {
      await window.__SEO_LENS_AUDIT_HEADERS__(r);
      await window.__SEO_LENS_AUDIT_LCP__(r);
    }
    if (withWeight) await window.__SEO_LENS_AUDIT_WEIGHT__(r);
    return {
      score: r.score,
      counts: r.counts,
      issues: r.issues.map((i) => ({
        code: i.code, severity: i.severity, params: i.params, detailRaw: i.detailRaw,
        count: i.count, paths: i.paths
      }))
    };
  }, { withHeaders: wantHeaders, withWeight: wantWeight });
}

const codes = (r) => r.issues.map((i) => i.code);
const find = (r, c) => r.issues.find((i) => i.code === c);

/* Opens the panel on a page with chrome.* stubbed, exactly as CLAUDE.md describes.
 * navigator.clipboard is stubbed too, so the copy paths can be asserted on without
 * granting clipboard permissions or reading the real system clipboard.
 */
async function openPanel(page, url, lang) {
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
    window.__clip = null;
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: (s) => { window.__clip = s; return Promise.resolve(); } }
    });
    window.__panel = () => {
      const h = Array.from(document.documentElement.children).find(
        (e) => e.id && e.id.indexOf("seo-lens-root-") === 0 && e.shadowRoot && e.shadowRoot.querySelector("#sl-panel")
      );
      return h ? h.shadowRoot : null;
    };
  }, lang);
  await page.addScriptTag({ content: read("content.js") });
  await page.evaluate(() => window.__listener({ type: "SEO_LENS_TOGGLE" }, {}, () => {}));
  await page.waitForTimeout(1200);
}

// Item 8 phase P1 — stubs chrome.runtime.sendMessage the way the real service worker's
// async sendResponse behaves: the callback fires after `delayMs`, carrying either the
// given response or, for `{ __lastError: "..." }`, a lastError the way a torn-down
// message channel actually reports (startOptimize() in content.js checks lastError
// inside the callback, not as a rejected promise, so this has to match that shape).
async function mockOptimize(page, response, delayMs) {
  await page.evaluate(({ response, delayMs }) => {
    window.chrome.runtime.sendMessage = (msg, cb) => {
      setTimeout(() => {
        if (response && response.__lastError) {
          window.chrome.runtime.lastError = { message: response.__lastError };
          cb(undefined);
          window.chrome.runtime.lastError = undefined;
        } else {
          window.chrome.runtime.lastError = undefined;
          cb(response);
        }
      }, delayMs || 0);
    };
  }, { response, delayMs });
}

(async () => {
  const cert = fs.readFileSync(path.join(__dirname, "cert.pem"));
  const key = fs.readFileSync(path.join(__dirname, "key.pem"));
  const server = await start(cert, key, 8443);
  // robots.txt lives at the origin, so the two degenerate responses need their own.
  const htmlRobots = await start(cert, key, 8444, HTML_ROBOTS_ROUTES);
  const errRobots = await start(cert, key, 8445, ERR_ROBOTS_ROUTES);
  // A second image origin, purely for item 8 phase P1's cross-origin fixture.
  const crossOrigin = await start(cert, key, 8446, CROSS_ORIGIN_ROUTES);
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
  check("no AI crawler blocked on an unrestricted URL", !!find(r, "AI_ROBOTS_OK"));
  check("robots.txt findings cost a clean page nothing", r.score === 100);
  check("clean raw HTML has full rendered-content coverage", !!find(r, "RAW_CONTENT_OK") && find(r, "RAW_CONTENT_OK").params.n >= 90,
    find(r, "RAW_CONTENT_OK") ? `${find(r, "RAW_CONTENT_OK").params.n}%` : "nothing found");
  const lcpText = find(r, "LCP_TEXT");
  check("a page with no images reports a text largest paint", !!lcpText && lcpText.severity === "stat",
    lcpText ? `${lcpText.params.n}ms` : "no LCP entry");
  check("the LCP measurement costs a clean page nothing", r.score === 100, `score ${r.score}`);

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

  /* ---- 3a. raw HTML versus rendered DOM ---- */
  console.log("\nraw-js-only.html");
  const rawBefore = await auditPage(page, `${B}/raw-js-only.html`, false);
  check("synchronous first paint has no raw-HTML finding", !codes(rawBefore).some((c) => c.indexOf("RAW_") === 0));
  r = await auditPage(page, `${B}/raw-js-only.html`, true);
  const lowCoverage = find(r, "RAW_CONTENT_LOW");
  check("a client-rendered shell has low raw coverage", !!lowCoverage && lowCoverage.params.n < 50,
    lowCoverage ? `${lowCoverage.params.n}%` : "nothing found");
  check("low raw coverage is a warning", !!lowCoverage && lowCoverage.severity === "warning");
  check("an H1 created by JavaScript is reported", !!find(r, "RAW_H1_MISSING"));
  check("H2 headings created by JavaScript are reported", !!find(r, "RAW_H2_MISSING"));
  check("JSON-LD created by JavaScript is reported", !!find(r, "RAW_JSONLD_MISSING"));
  check("a JavaScript-replaced title is reported", !!find(r, "RAW_TITLE_CHANGED"));
  check("a JavaScript-added canonical is reported", !!find(r, "RAW_CANON_MISSING"));
  check("raw noindex removed by JavaScript is an error",
    !!find(r, "RAW_NOINDEX_REMOVED") && find(r, "RAW_NOINDEX_REMOVED").severity === "error");
  check("raw findings are merged only by the async pass", r.score < rawBefore.score, `${rawBefore.score} → ${r.score}`);

  console.log("\nraw-partial.html");
  r = await auditPage(page, `${B}/raw-partial.html`, true);
  const partialCoverage = find(r, "RAW_CONTENT_PARTIAL");
  check("partial raw coverage is reported as a neutral measurement",
    !!partialCoverage && partialCoverage.severity === "stat" && partialCoverage.params.n >= 50 && partialCoverage.params.n < 90,
    partialCoverage ? `${partialCoverage.params.n}%` : "nothing found");
  check("a title absent from raw HTML is reported", !!find(r, "RAW_TITLE_MISSING"));
  check("a canonical changed by JavaScript is reported", !!find(r, "RAW_CANON_CHANGED"));
  check("robots directives added by JavaScript are reported", !!find(r, "RAW_ROBOTS_ADDED"));

  console.log("\nraw robots variants");
  r = await auditPage(page, `${B}/raw-robots-removed.html`, true);
  check("robots directives removed by JavaScript are reported", !!find(r, "RAW_ROBOTS_REMOVED"));
  r = await auditPage(page, `${B}/raw-robots-changed.html`, true);
  check("robots directives replaced by JavaScript are reported", !!find(r, "RAW_ROBOTS_CHANGED"));

  /* ---- 3b. robots.txt: the AI crawler matrix ---- */
  console.log("\nai-blocked.html");
  const aiBefore = await auditPage(page, `${B}/ai-blocked.html`, false);
  check("synchronous pass sees no robots.txt finding", !codes(aiBefore).some((c) => c.indexOf("AI_") === 0));
  r = await auditPage(page, `${B}/ai-blocked.html`, true);
  const search = find(r, "AI_SEARCH_BLOCKED");
  check("blocked search crawlers are a warning", !!search && search.severity === "warning",
    search ? search.params.bots : "nothing found");
  check("multi-agent group applies to both agents in it",
    !!search && search.params.bots.indexOf("OAI-SearchBot") > -1 && search.params.bots.indexOf("Claude-SearchBot") > -1,
    search ? search.params.bots : "");
  check("the matched rule is carried for the ticket", !!search && search.detailRaw.indexOf("Disallow: /ai-blocked.html") > -1,
    search ? search.detailRaw : "");
  const train = find(r, "AI_TRAIN_BLOCKED");
  check("a wildcard rule matches (GPTBot: /ai-*)", !!train && train.params.bots === "GPTBot", train ? train.params.bots : "");
  check("opting out of training costs no points", !!train && train.severity === "stat");
  check("Google-Extended matched through its $ anchor", !!find(r, "AI_GEMINI_BLOCKED"));
  check("Google-Extended is reported as neutral, not as a defect",
    !!find(r, "AI_GEMINI_BLOCKED") && find(r, "AI_GEMINI_BLOCKED").severity === "stat");
  check("no pass row once anything is blocked", !find(r, "AI_ROBOTS_OK"));
  check("only the search block costs points", r.score === aiBefore.score - 4, `${aiBefore.score} → ${r.score}`);

  console.log("\nprivate/page.html");
  r = await auditPage(page, `${B}/private/page.html`, true);
  const blocked = find(r, "ROBOTS_BLOCKS_PAGE");
  check("a URL disallowed for Googlebot is an error", !!blocked && blocked.severity === "error",
    blocked ? blocked.detailRaw : "nothing found");
  check("an agent with no group of its own falls back to *",
    !!find(r, "AI_SEARCH_BLOCKED") && find(r, "AI_SEARCH_BLOCKED").params.bots === "PerplexityBot",
    find(r, "AI_SEARCH_BLOCKED") ? find(r, "AI_SEARCH_BLOCKED").params.bots : "");
  check("an agent with its own group ignores * entirely",
    !!find(r, "AI_SEARCH_BLOCKED") && find(r, "AI_SEARCH_BLOCKED").params.bots.indexOf("OAI-SearchBot") === -1);

  console.log("\nprivate/public.html");
  r = await auditPage(page, `${B}/private/public.html`, true);
  check("a longer Allow beats the folder Disallow", !find(r, "ROBOTS_BLOCKS_PAGE"));
  check("and the page reads as unblocked", !!find(r, "AI_ROBOTS_OK"));

  console.log("\nrobots.txt served as HTML (:8444)");
  r = await auditPage(page, "https://localhost:8444/page.html", true);
  check("an HTML robots.txt is flagged", !!find(r, "ROBOTS_HTML"));
  check("and no rule is invented from it", !codes(r).some((c) => c.indexOf("AI_") === 0));

  console.log("\nrobots.txt returning 503 (:8445)");
  r = await auditPage(page, "https://localhost:8445/page.html", true);
  const r5 = find(r, "ROBOTS_5XX");
  check("a 5xx robots.txt is a warning, not silence", !!r5 && r5.severity === "warning", r5 ? String(r5.params.n) : "");

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

  /* ---- 4b. image weight and LCP ---- */
  console.log("\nimages.html");
  const sync = await auditPage(page, `${B}/images.html`, false);
  const lazySync = find(sync, "IMG_LAZY_ABOVE");
  check("both above-the-fold lazy images are caught before the LCP pass",
    !!lazySync && lazySync.count === 2 && lazySync.severity === "warning",
    lazySync ? `${lazySync.count} elements` : "nothing found");

  r = await auditPage(page, `${B}/images.html`, true);
  const lcpImg = find(r, "LCP_IMG");
  check("the largest paint is identified as an image", !!lcpImg && lcpImg.severity === "stat",
    lcpImg ? `${lcpImg.detailRaw} · ${lcpImg.params.n}ms` : "no LCP entry");
  check("and it is the hero, not a thumbnail", !!lcpImg && lcpImg.detailRaw === "hero.png",
    lcpImg ? lcpImg.detailRaw : "");
  check("the LCP element is highlightable on the page", !!lcpImg && lcpImg.count === 1);
  const lcpLazy = find(r, "LCP_LAZY");
  check("a lazy-loaded LCP image is a warning", !!lcpLazy && lcpLazy.severity === "warning");
  const lazyAsync = find(r, "IMG_LAZY_ABOVE");
  check("the LCP image is not also counted by the generic lazy finding",
    !!lazyAsync && lazyAsync.count === 1 && lazyAsync.params.n === 1,
    lazyAsync ? `${lazyAsync.count} left` : "finding removed entirely");
  const prio = find(r, "LCP_NO_PRIORITY");
  check('missing fetchpriority="high" on the LCP image is an info', !!prio && prio.severity === "info");
  const legacy = find(r, "IMG_LEGACY_FORMAT");
  check("legacy raster formats are flagged", !!legacy && legacy.count === 3,
    legacy ? `${legacy.count} images · ${legacy.detailRaw}` : "nothing found");
  check("the SVG is not accused of being a legacy format", !!legacy && legacy.detailRaw.indexOf("svg") === -1);
  const srcset = find(r, "IMG_NO_SRCSET");
  check("only the wide image is asked for a srcset", !!srcset && srcset.count === 1,
    srcset ? `${srcset.count} images` : "nothing found");
  const over = find(r, "IMG_OVERSIZED");
  check("overscale is measured at this screen's pixel ratio", !!over && over.count === 2,
    over ? over.detailRaw : "nothing found");
  check("and the ratio it was measured at is in the detail", !!over && /@1×/.test(over.detailRaw));

  // The same page on a 2× screen: a 400px asset displayed at 200px is correctly authored
  // there, and the pre-v2.6 rule (naturalWidth > width * 2, with no DPR term) had no way
  // to say so. This is the assertion that the correction actually corrects something.
  console.log("\nimages.html on a 2× screen");
  const hidpi = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });
  const hidpiPage = await hidpi.newPage();
  const r2 = await auditPage(hidpiPage, `${B}/images.html`, false);
  check("a 2× asset is not called oversized on a 2× screen", !find(r2, "IMG_OVERSIZED"),
    find(r2, "IMG_OVERSIZED") ? find(r2, "IMG_OVERSIZED").detailRaw : "no finding, as intended");
  await hidpi.close();

  /* ---- 4c. image weight — item 8 phase P1 ---- */
  console.log("\nimages.html — weight pass");
  const rw = await auditPage(page, `${B}/images.html`, true, true);
  const lcpBytes = find(rw, "LCP_IMG").paths[0].bytes;
  check("the LCP image gets a real byte reading, not null or 0",
    typeof lcpBytes === "number" && lcpBytes > 0, `${lcpBytes} bytes`);
  const overW = find(rw, "IMG_OVERSIZED");
  check("every oversized image gets a byte reading",
    overW.paths.every((p) => typeof p.bytes === "number" && p.bytes > 0),
    overW.paths.map((p) => p.bytes).join(", "));
  const legacyW = find(rw, "IMG_LEGACY_FORMAT");
  check("every legacy-format image gets a byte reading",
    legacyW.paths.every((p) => typeof p.bytes === "number" && p.bytes > 0),
    legacyW.paths.map((p) => p.bytes).join(", "));
  const srcsetW = find(rw, "IMG_NO_SRCSET");
  check("a finding outside OPTIMIZABLE_CODES carries no bytes field at all",
    srcsetW.paths.every((p) => p.bytes === undefined));

  console.log("\ncross-origin.html — weight pass leaves it unknown");
  const rx = await auditPage(page, `${B}/cross-origin.html`, true, true);
  const overX = find(rx, "IMG_OVERSIZED");
  check("the finding still fires for a cross-origin image", !!overX && overX.count === 1);
  check("but its bytes are undefined, never a real number or a confident zero",
    overX.paths[0].bytes === undefined, String(overX.paths[0].bytes));

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

  /* ---- 5b. the LCP slot in the panel header ---- */
  for (const lang of ["en", "fa"]) {
  console.log(`\nLCP slot (${lang})`);
  await openPanel(page, `${B}/images.html`, lang);
  // Computed style, not the hidden attribute: `.sl-lcp{display:flex}` would outrank the
  // UA sheet's `[hidden]{display:none}` exactly the way the v2.3.0 export menu did.
  const slot = await page.evaluate(() => {
    const sh = window.__panel();
    const el = sh.querySelector("#sl-lcp");
    return {
      shown: getComputedStyle(el).display !== "none",
      name: sh.querySelector("#sl-lcp-name").textContent,
      ms: sh.querySelector("#sl-lcp-ms").textContent,
      outlined: (() => {
        el.click();
        const layer = Array.from(document.documentElement.children)
          .find((n) => n.id && /^seo-lens-root-.*-ov$/.test(n.id));
        return !!(layer && layer.shadowRoot && layer.shadowRoot.querySelectorAll(".box").length);
      })()
    };
  });
  check("the LCP slot is shown when an image is the largest paint", slot.shown === true);
  check("the slot names the file", slot.name.indexOf("hero.png") > -1, slot.name);
  check("the slot carries the timing", /\d/.test(slot.ms), slot.ms);
  check("clicking the slot outlines the element on the page", slot.outlined === true);
  const shot = path.join(__dirname, `panel-lcp-${lang}.png`);
  await page.screenshot({ path: shot });
  console.log(`        screenshot: ${shot}`);
  }

  /* ---- 5c. the Optimize action — item 8 phase P1 ---- */
  console.log("\nOptimize action");
  await openPanel(page, `${B}/images.html`, "en");

  // One finding with at least two optimizable images (each path gets its own button,
  // its own state) and a distinct finding with exactly one, so the retry path can be
  // exercised without disturbing the multi-image scenarios above it.
  const idxInfo = await page.evaluate(() => {
    const items = Array.from(window.__panel().querySelectorAll(".sl-item"));
    const counts = items.map((n) => n.querySelectorAll(".sl-opt").length);
    const multi = counts.findIndex((c) => c >= 2);
    const single = counts.findIndex((c) => c === 1);
    if (multi > -1) items[multi].querySelector(".sl-row").click();
    if (single > -1 && single !== multi) items[single].querySelector(".sl-row").click();
    return { multi, single, counts };
  });
  check("a finding with at least two optimizable images exists to test against",
    idxInfo.multi > -1, JSON.stringify(idxInfo.counts));
  check("a distinct single-image finding exists for the retry scenario",
    idxInfo.single > -1 && idxInfo.single !== idxInfo.multi, JSON.stringify(idxInfo));

  const badge = await page.evaluate((idx) => {
    const w = window.__panel().querySelectorAll(".sl-item")[idx].querySelector(".sl-weight");
    return w ? { text: w.textContent, unknown: w.classList.contains("unknown") } : null;
  }, idxInfo.multi);
  check("the row shows a real byte weight before anything is clicked",
    !!badge && !badge.unknown && /\d/.test(badge.text), badge && badge.text);

  // Success: a busy state right after the click (synchronous, before the mocked
  // response arrives), then a download link once it resolves.
  await mockOptimize(page, {
    ok: true, beforeBytes: 200000, afterBytes: 50000, mime: "image/webp",
    b64: Buffer.from("fake-webp-bytes").toString("base64")
  }, 60);
  await page.evaluate((idx) => {
    window.__panel().querySelectorAll(".sl-item")[idx].querySelectorAll(".sl-opt")[0].click();
  }, idxInfo.multi);
  const busy = await page.evaluate((idx) => {
    const s = window.__panel().querySelectorAll(".sl-item")[idx].querySelectorAll(".sl-opt-status")[0];
    return s ? s.textContent : null;
  }, idxInfo.multi);
  check("clicking Optimize shows a busy state right away", (busy || "").indexOf("Optimizing") > -1, busy);

  await page.waitForFunction((idx) => {
    return !!window.__panel().querySelectorAll(".sl-item")[idx].querySelector(".sl-opt-dl");
  }, idxInfo.multi, { timeout: 5000 });
  const done = await page.evaluate((idx) => {
    const item = window.__panel().querySelectorAll(".sl-item")[idx];
    const a = item.querySelector(".sl-opt-dl");
    const status = item.querySelector(".sl-opt-status");
    return { href: a.getAttribute("href"), download: a.getAttribute("download"), status: status ? status.textContent : "" };
  }, idxInfo.multi);
  check("a successful optimize renders a download link to a blob URL", done.href.indexOf("blob:") === 0, done.href);
  check("the filename is derived from the source and marked optimized",
    /-optimized\.webp$/.test(done.download), done.download);
  check("the status line reports the before/after saving", /\d+ KB.*\d+ KB.*%/.test(done.status), done.status);

  // The "no saving" edge case found during testing: a re-encode that comes back larger
  // is reported plainly, never offered as a download or treated as an error.
  await mockOptimize(page, {
    ok: true, beforeBytes: 500, afterBytes: 900, mime: "image/webp",
    b64: Buffer.from("x").toString("base64")
  }, 20);
  await page.evaluate((idx) => {
    window.__panel().querySelectorAll(".sl-item")[idx].querySelectorAll(".sl-opt")[0].click();
  }, idxInfo.multi);
  await page.waitForFunction((idx) => {
    const rows = window.__panel().querySelectorAll(".sl-item")[idx].querySelectorAll(".sl-optrow");
    return rows[1] && rows[1].textContent.indexOf("wasn't smaller") > -1;
  }, idxInfo.multi, { timeout: 5000 });
  const nosave = await page.evaluate((idx) => {
    const rows = window.__panel().querySelectorAll(".sl-item")[idx].querySelectorAll(".sl-optrow");
    return { hasButton: !!rows[1].querySelector(".sl-opt"), hasLink: !!rows[1].querySelector(".sl-opt-dl"), text: rows[1].textContent };
  }, idxInfo.multi);
  check("a larger re-encode is never offered as a download", nosave.hasLink === false, nosave.text);
  check("and it is not treated as an error either — no retry button", nosave.hasButton === false, nosave.text);

  // Failure: chrome.runtime.lastError surfaces as a retry button, not a stuck busy state,
  // and retrying re-runs the same click handler to a normal success.
  await mockOptimize(page, { __lastError: "message channel closed" }, 20);
  await page.evaluate((idx) => {
    window.__panel().querySelectorAll(".sl-item")[idx].querySelectorAll(".sl-opt")[0].click();
  }, idxInfo.single);
  await page.waitForFunction((idx) => {
    return window.__panel().querySelectorAll(".sl-item")[idx].textContent.indexOf("Optimize failed") > -1;
  }, idxInfo.single, { timeout: 5000 });
  const failed = await page.evaluate((idx) => {
    const btn = window.__panel().querySelectorAll(".sl-item")[idx].querySelector(".sl-opt");
    return btn ? btn.textContent : null;
  }, idxInfo.single);
  check("a failed optimize offers a retry button, not a dead end", failed === "Try again", failed);

  await mockOptimize(page, {
    ok: true, beforeBytes: 90000, afterBytes: 30000, mime: "image/webp",
    b64: Buffer.from("retry-bytes").toString("base64")
  }, 20);
  await page.evaluate((idx) => {
    window.__panel().querySelectorAll(".sl-item")[idx].querySelector(".sl-opt").click();
  }, idxInfo.single);
  await page.waitForFunction((idx) => {
    return !!window.__panel().querySelectorAll(".sl-item")[idx].querySelector(".sl-opt-dl");
  }, idxInfo.single, { timeout: 5000 });
  const retried = await page.evaluate((idx) => {
    const a = window.__panel().querySelectorAll(".sl-item")[idx].querySelector(".sl-opt-dl");
    return a ? a.getAttribute("href") : null;
  }, idxInfo.single);
  check("retrying after a failure succeeds normally", !!retried && retried.indexOf("blob:") === 0, retried);

  /* ---- 5d. the panel keeps the reader's place — the v2.8.0 fix ----
   * Optimize used to call renderList(), which rebuilds #sl-body wholesale: every expanded
   * finding collapsed and the scroll position went with it, so a click on a row halfway
   * down the panel dropped the reader at the top of a list they then had to re-open and
   * re-scroll to find the row they had just clicked. "The item is still open" is not a
   * sufficient assertion — a re-render that restored the open class would satisfy it while
   * still destroying the node under the reader's cursor — so the DOM nodes themselves are
   * marked before the click and looked for afterwards.
   */
  console.log("\nOptimize leaves the reader where they were");
  // A short viewport guarantees the panel body actually overflows, so "kept the scroll
  // position" is a claim about a real scroll offset rather than about zero.
  await page.setViewportSize({ width: 1280, height: 520 });
  // A fresh panel, so every image row is back to an idle Optimize button.
  await openPanel(page, `${B}/images.html`, "en");
  const freshIdx = await page.evaluate(() => {
    const items = Array.from(window.__panel().querySelectorAll(".sl-item"));
    const idx = items.findIndex((n) => n.querySelectorAll(".sl-opt").length >= 2);
    if (idx > -1) items[idx].querySelector(".sl-row").click();
    return idx;
  });
  check("a finding with two optimizable images is open for the scroll test", freshIdx > -1, String(freshIdx));
  await mockOptimize(page, {
    ok: true, beforeBytes: 120000, afterBytes: 40000, mime: "image/webp",
    b64: Buffer.from("kept-in-place").toString("base64")
  }, 40);
  const place = await page.evaluate((idx) => {
    const sh = window.__panel();
    const item = sh.querySelectorAll(".sl-item")[idx];
    const body = sh.querySelector("#sl-body");
    item.__mark = "item";
    Array.from(item.querySelectorAll(".sl-optrow")).forEach((r, n) => { r.__mark = "row" + n; });
    body.scrollTop = body.scrollHeight - body.clientHeight;
    // What the reader actually cares about is that the panel does not move under them.
    // The last finding's position on screen is that, measured directly — scrollTop alone
    // would be the wrong assertion, because Chrome's scroll anchoring deliberately
    // adjusts it by a few pixels when a row above the viewport changes height, which is
    // the browser keeping the view still rather than moving it.
    const all = sh.querySelectorAll(".sl-item");
    const ref = all[all.length - 1].getBoundingClientRect().top;
    item.querySelectorAll(".sl-opt")[0].click();
    return { scroll: body.scrollTop, ref, overflows: body.scrollHeight > body.clientHeight };
  }, freshIdx);
  check("the panel body really is scrolled away from the top before the click",
    place.overflows === true && place.scroll > 0, `scrollTop ${place.scroll}`);

  await page.waitForFunction((idx) => {
    const rows = window.__panel().querySelectorAll(".sl-item")[idx].querySelectorAll(".sl-optrow");
    return !!rows[0].querySelector(".sl-opt-dl");
  }, freshIdx, { timeout: 5000 });
  const kept = await page.evaluate((idx) => {
    const sh = window.__panel();
    const item = sh.querySelectorAll(".sl-item")[idx];
    const body = sh.querySelector("#sl-body");
    const rows = item.querySelectorAll(".sl-optrow");
    return {
      sameItem: item.__mark === "item",
      sameClickedRow: rows[0].__mark === "row0",
      sameOtherRow: rows[1] ? rows[1].__mark === "row1" : true,
      otherRowHasButton: rows[1] ? !!rows[1].querySelector(".sl-opt") : true,
      open: item.classList.contains("open"),
      scroll: body.scrollTop,
      ref: (() => {
        const all = sh.querySelectorAll(".sl-item");
        return all[all.length - 1].getBoundingClientRect().top;
      })()
    };
  }, freshIdx);
  check("optimizing does not rebuild the list", kept.sameItem === true);
  check("the clicked row is repainted in place, not replaced", kept.sameClickedRow === true);
  check("a sibling image row is not touched at all",
    kept.sameOtherRow === true && kept.otherRowHasButton === true);
  check("the finding the reader opened stays open", kept.open === true);
  check("and the panel does not move under the reader",
    Math.abs(kept.ref - place.ref) <= 1,
    `reference finding moved ${Math.round(kept.ref - place.ref)}px (scrollTop ${place.scroll} → ${kept.scroll})`);

  // The re-renders that are unavoidable — a rescan, a language switch, an async pass
  // merging new findings — must not cost the reader their place either. Highlight-all
  // is the cheapest genuine renderList() the panel exposes to a test.
  const rerender = await page.evaluate((idx) => {
    const sh = window.__panel();
    const body = sh.querySelector("#sl-body");
    const openBefore = Array.from(sh.querySelectorAll(".sl-item.open")).map((n) => n.dataset.id);
    const scrollBefore = body.scrollTop;
    sh.querySelector("#sl-hl-all").click();
    const item = sh.querySelectorAll(".sl-item")[idx];
    return {
      openBefore, scrollBefore,
      rebuilt: item.__mark !== "item",
      openAfter: Array.from(sh.querySelectorAll(".sl-item.open")).map((n) => n.dataset.id),
      scrollAfter: body.scrollTop,
      keptDownload: !!item.querySelector(".sl-opt-dl")
    };
  }, freshIdx);
  check("highlight-all really does rebuild the list", rerender.rebuilt === true,
    "otherwise the three checks below would prove nothing");
  check("a full re-render keeps every expanded finding expanded",
    rerender.openAfter.join("|") === rerender.openBefore.join("|"),
    `${rerender.openBefore.join("|")} → ${rerender.openAfter.join("|")}`);
  check("a full re-render keeps the scroll position",
    rerender.scrollAfter === rerender.scrollBefore,
    `${rerender.scrollBefore} → ${rerender.scrollAfter}`);
  check("and the optimized file survives it, because the state is keyed to the element",
    rerender.keptDownload === true);
  await page.setViewportSize({ width: 1280, height: 900 });

  /* ---- 6. developer hand-off: inventories, CSV, ticket ---- */
  console.log("\ndeveloper export");
  await openPanel(page, `${B}/assets.html`, "en");

  const tables = await page.evaluate(() => {
    const r = window.__SEO_LENS_AUDIT__();
    return {
      images: r.tables.images.length,
      imagesTotal: r.tables.imagesTotal,
      firstAlt: r.tables.images[0].alt,
      secondHasAlt: r.tables.images[1].hasAlt,
      scopes: r.tables.links.map((l) => l.scope).join(","),
      nofollow: r.tables.links.filter((l) => l.nofollow).length,
      links: r.tables.links.length
    };
  });
  check("image inventory covers every image", tables.images === 3 && tables.imagesTotal === 3, `${tables.images} rows`);
  check("missing alt recorded as hasAlt=false", tables.secondHasAlt === false);
  check("link scope recorded per link", tables.scopes === "internal,external,internal", tables.scopes);
  check("nofollow recorded", tables.nofollow === 1, `${tables.links} links`);

  // Asserted through getComputedStyle rather than the hidden attribute: v2.3.0 shipped a
  // menu whose `.sl-menu{display:flex}` outranked the UA sheet's `[hidden]{display:none}`,
  // so the attribute toggled correctly while the menu stayed on screen for ever. A test
  // that reads the attribute would have passed.
  const menuState = await page.evaluate(() => {
    const sh = window.__panel();
    const menu = sh.querySelector("#sl-menu");
    const shown = () => getComputedStyle(menu).display !== "none";
    const start = shown();
    sh.querySelector("#sl-export").click();
    const afterOpen = shown();
    sh.querySelector(".sl-body").click();
    return { start, afterOpen, afterOutside: shown() };
  });
  check("export menu starts closed", menuState.start === false, `display says ${menuState.start ? "visible" : "hidden"}`);
  check("export menu opens on click", menuState.afterOpen === true);
  check("export menu closes on an outside click", menuState.afterOutside === false);

  async function exportCsv(which) {
    const [dl] = await Promise.all([
      page.waitForEvent("download"),
      page.evaluate((w) => {
        const sh = window.__panel();
        sh.querySelector("#sl-export").click();
        sh.querySelector('.sl-menu button[data-x="' + w + '"]').click();
      }, which)
    ]);
    return fs.readFileSync(await dl.path(), "utf8");
  }

  const fcsv = await exportCsv("findings");
  check("findings CSV starts with a BOM", fcsv.charCodeAt(0) === 0xfeff, "so Excel reads it as UTF-8");
  check("findings CSV has a header row", fcsv.split("\r\n")[0] === '﻿"Severity","Category","Code","Issue","Detail","Fix","Elements","Element path","Element text","Page URL"');
  check("findings CSV carries the codes", fcsv.indexOf("IMG_NO_ALT") > -1);
  check("findings CSV is one row per element", fcsv.split("\r\n").filter((l) => l.indexOf("IMG_NO_ALT") > -1).length >= 1);
  check("passing checks are not exported as findings", fcsv.indexOf("TITLE_OK") === -1);

  const icsv = await exportCsv("images");
  check("images CSV lists every image", icsv.trim().split("\r\n").length === 4, `${icsv.trim().split("\r\n").length - 1} rows`);
  check(
    "a formula-shaped alt is neutralised", icsv.indexOf('"\'=SUM(A1:A9)') > -1,
    "leading apostrophe, so Excel treats it as text"
  );

  const lcsv = await exportCsv("links");
  check("links CSV lists every link", lcsv.trim().split("\r\n").length === 4);
  check("links CSV resolves hrefs to absolute", lcsv.indexOf("https://localhost:8443/internal.html") > -1);
  check("links CSV names the scope", lcsv.indexOf('"external"') > -1);

  const ticket = await page.evaluate(() => {
    const sh = window.__panel();
    const item = Array.from(sh.querySelectorAll(".sl-item")).find((n) => n.querySelector(".sl-ticket"));
    item.querySelector(".sl-row").click();
    item.querySelector(".sl-ticket").click();
    return window.__clip;
  });
  check("ticket starts with a pasteable title", !!ticket && ticket.indexOf("[SEO] ") === 0, ticket ? ticket.split("\n")[0] : "nothing copied");
  check("ticket carries the URL", !!ticket && ticket.indexOf(`${B}/assets.html`) > -1);
  check("ticket carries an acceptance criterion", !!ticket && /Acceptance criterion:/.test(ticket));
  check("ticket carries the element selector", !!ticket && /Affected elements:/.test(ticket));

  const errs = await page.evaluate(() => {
    const sh = window.__panel();
    sh.querySelector("#sl-export").click();
    sh.querySelector('.sl-menu button[data-x="errors"]').click();
    return window.__clip;
  });
  check("copy-all-errors copies every error as a ticket", !!errs && errs.indexOf("[SEO] ") === 0 && errs.indexOf("IMG_NO_ALT") > -1);

  await page.screenshot({ path: path.join(__dirname, "panel-export.png") });
  console.log(`        screenshot: ${path.join(__dirname, "panel-export.png")}`);

  /* ---- 7. background.js — the SEO_LENS_OPTIMIZE handler itself, item 8 phase P1 ---- */
  console.log("\nbackground.js — SEO_LENS_OPTIMIZE handler");
  await page.goto(`${B}/clean.html`, { waitUntil: "load" });
  await page.evaluate(() => {
    window.__bgListeners = [];
    window.chrome = {
      action: { onClicked: { addListener: () => {} }, setBadgeText: () => {}, setBadgeBackgroundColor: () => {} },
      tabs: { sendMessage: () => Promise.reject(new Error("no tab")), create: () => {} },
      scripting: { executeScript: () => Promise.resolve() },
      runtime: {
        onMessage: { addListener: (fn) => { window.__bgListeners.push(fn); } },
        getURL: () => ""
      }
    };
  });
  await page.addScriptTag({ content: read("background.js") });
  const inputB64 = THUMB_PNG.toString("base64");
  // Every listener background.js registers gets the message, the way chrome.runtime
  // actually dispatches — only the SEO_LENS_OPTIMIZE one should ever call back.
  const encoded = await page.evaluate((b64) => new Promise((resolve) => {
    const msg = { type: "SEO_LENS_OPTIMIZE", b64, mime: "image/png", width: 200 };
    let settled = false;
    const respond = (res) => { if (!settled) { settled = true; resolve(res); } };
    window.__bgListeners.forEach((fn) => fn(msg, {}, respond));
  }), inputB64);
  check("the handler accepts a base64 image and reports success",
    !!encoded && encoded.ok === true,
    JSON.stringify(encoded && { ok: encoded.ok, error: encoded.error, mime: encoded.mime }));
  check("beforeBytes reflects the real source size",
    encoded.beforeBytes === THUMB_PNG.length, `${encoded.beforeBytes} vs ${THUMB_PNG.length}`);
  check("afterBytes is a real measurement of the re-encoded blob",
    typeof encoded.afterBytes === "number" && encoded.afterBytes > 0, encoded.afterBytes);
  check("the handler re-encodes to WebP, per 8h.2's decision", encoded.mime === "image/webp", encoded.mime);
  const outBytes = Buffer.from(encoded.b64, "base64");
  check("the returned base64 decodes to real bytes matching afterBytes",
    outBytes.length === encoded.afterBytes, `${outBytes.length} vs ${encoded.afterBytes}`);
  check("the output is a genuine WebP container, not a renamed copy of the input",
    outBytes.slice(0, 4).toString("latin1") === "RIFF" && outBytes.slice(8, 12).toString("latin1") === "WEBP",
    outBytes.slice(0, 12).toString("latin1"));

  /* ---- 8. the standalone image compressor page (compress.html) ----
   * An extension page, so it is driven over file:// rather than through the injection
   * harness: nothing about it needs a tab, a content script or a service worker.
   */
  console.log("\ncompress.html — image compressor");
  const tmpPng = path.join(__dirname, "tmp-compress-input.png");
  fs.writeFileSync(tmpPng, PHOTO_PNG);
  // A real, minimal GIF — the guard reads the MIME type the browser derives from the
  // extension, but feeding it anything that is not actually a GIF would test nothing.
  const tmpGif = path.join(__dirname, "tmp-compress-input.gif");
  fs.writeFileSync(tmpGif, Buffer.from(
    "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64"));

  await page.goto("file://" + path.join(REPO, "compress.html"), { waitUntil: "load" });
  const intro = await page.evaluate(() => ({
    title: document.getElementById("page-title").textContent,
    lead: document.getElementById("lead").textContent,
    controlsHidden: document.getElementById("controls").hidden,
    summaryHidden: document.getElementById("summary").hidden
  }));
  check("the page names itself", intro.title === "Image compressor", intro.title);
  check("the promise on the page is file size only, in so many words",
    /dimensions/i.test(intro.lead), intro.lead);
  check("controls and summary stay out of the way until there is a file",
    intro.controlsHidden === true && intro.summaryHidden === true);

  await page.setInputFiles("#file", tmpPng);
  await page.waitForSelector(".row .dl", { timeout: 20000 });
  const webp = await page.evaluate(async () => {
    const a = document.querySelector(".row .dl");
    const blob = await fetch(a.href).then((r) => r.blob());
    const bmp = await createImageBitmap(blob);
    return {
      name: a.getAttribute("download"), type: blob.type, bytes: blob.size,
      w: bmp.width, h: bmp.height,
      dims: document.querySelector(".row .dims").textContent,
      res: document.querySelector(".row .res").textContent,
      summary: document.getElementById("summary").textContent
    };
  });
  // The whole point of this page: an image already sized correctly for where it is used
  // must come back the same size. A compressor that quietly resizes is a different tool.
  check("the compressed file keeps the source dimensions exactly",
    webp.w === 600 && webp.h === 450, `${webp.w}×${webp.h}`);
  check("and it really is smaller", webp.bytes < PHOTO_PNG.length,
    `${PHOTO_PNG.length} → ${webp.bytes}`);
  check("the output is a real WebP, not a renamed PNG", webp.type === "image/webp", webp.type);
  check("the download is named for the original and marked", /-min\.webp$/.test(webp.name), webp.name);
  check("the row says the dimensions were left alone",
    /600×450/.test(webp.dims) && /unchanged/.test(webp.dims), webp.dims);
  check("the row reports the measured saving", /\d+ KB.*\d+ KB.*%/.test(webp.res), webp.res);
  check("one file is summarised as one file, not \"1 files\"",
    /^1 file /.test(webp.summary), webp.summary);
  await page.screenshot({ path: path.join(__dirname, "compress-en.png") });
  console.log(`        screenshot: ${path.join(__dirname, "compress-en.png")}`);

  await page.selectOption("#format", "image/jpeg");
  await page.waitForFunction(() => {
    const a = document.querySelector(".row .dl");
    return !!a && /-min\.jpg$/.test(a.getAttribute("download"));
  }, null, { timeout: 20000 });
  const jpg = await page.evaluate(async () => {
    const a = document.querySelector(".row .dl");
    const blob = await fetch(a.href).then((r) => r.blob());
    const bmp = await createImageBitmap(blob);
    return { type: blob.type, w: bmp.width, h: bmp.height };
  });
  check("changing the output format re-encodes the same file", jpg.type === "image/jpeg", jpg.type);
  check("and the dimensions are still untouched", jpg.w === 600 && jpg.h === 450, `${jpg.w}×${jpg.h}`);

  await page.setInputFiles("#file", tmpGif);
  await page.waitForFunction(() => document.querySelectorAll(".row").length === 2, null, { timeout: 20000 });
  const gif = await page.evaluate(() => {
    const row = document.querySelectorAll(".row")[1];
    return { text: row.querySelector(".res").textContent, hasDownload: !!row.querySelector(".dl") };
  });
  check("an animated GIF is refused with the reason, not silently flattened",
    /first frame/.test(gif.text), gif.text);
  check("and it is never offered as a download", gif.hasDownload === false);

  await page.click("#btn-lang");
  const fa = await page.evaluate(() => ({
    dir: document.documentElement.getAttribute("dir"),
    lang: document.documentElement.getAttribute("lang"),
    title: document.getElementById("page-title").textContent,
    english: /[A-Za-z]{4}/.test(document.getElementById("lead").textContent)
  }));
  check("the Persian side mirrors the whole page", fa.dir === "rtl" && fa.lang === "fa",
    `${fa.dir} / ${fa.lang}`);
  check("and it is actually in Persian", fa.english === false && fa.title.length > 0, fa.title);
  await page.screenshot({ path: path.join(__dirname, "compress-fa.png") });
  console.log(`        screenshot: ${path.join(__dirname, "compress-fa.png")}`);

  fs.unlinkSync(tmpPng);
  fs.unlinkSync(tmpGif);

  await browser.close();
  server.close();
  htmlRobots.close();
  errRobots.close();
  crossOrigin.close();
  console.log(`\n${failures ? failures + " FAILURES" : "all checks passed"}`);
  process.exit(failures ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
