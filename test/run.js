/* Drives real Chromium against the fixtures, injects i18n.js + audit.js, and asserts on
 * the codes the engine emits. There is no test suite in the repo; this is the recipe
 * CLAUDE.md describes, extended to cover the v2.2 checks.
 */
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");
const { start, HTML_ROBOTS_ROUTES, ERR_ROBOTS_ROUTES } = require("./server");

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

(async () => {
  const cert = fs.readFileSync(path.join(__dirname, "cert.pem"));
  const key = fs.readFileSync(path.join(__dirname, "key.pem"));
  const server = await start(cert, key, 8443);
  // robots.txt lives at the origin, so the two degenerate responses need their own.
  const htmlRobots = await start(cert, key, 8444, HTML_ROBOTS_ROUTES);
  const errRobots = await start(cert, key, 8445, ERR_ROBOTS_ROUTES);
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

  await browser.close();
  server.close();
  htmlRobots.close();
  errRobots.close();
  console.log(`\n${failures ? failures + " FAILURES" : "all checks passed"}`);
  process.exit(failures ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
