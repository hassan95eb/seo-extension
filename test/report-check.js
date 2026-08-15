/* Renders report.html against a real audit payload, in both languages, and screenshots it.
 * The report is the surface where RTL scrambling is most expensive, so it gets looked at.
 */
const fs = require("fs"), path = require("path"), http = require("http");
const { chromium } = require("playwright");
const { start } = require("./server");
const REPO = process.env.REPO || path.join(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(REPO, f), "utf8");

(async () => {
  const tls = await start(fs.readFileSync(path.join(__dirname, "cert.pem")), fs.readFileSync(path.join(__dirname, "key.pem")), 8443);
  // report.html is an extension page; serve it over plain http so it can load its own assets.
  const files = http.createServer((req, res) => {
    const f = req.url.split("?")[0].slice(1) || "report.html";
    try {
      const body = fs.readFileSync(path.join(REPO, f));
      res.writeHead(200, { "Content-Type": f.endsWith(".css") ? "text/css" : f.endsWith(".js") ? "text/javascript" : "text/html; charset=utf-8" });
      res.end(body);
    } catch (e) { res.writeHead(404); res.end(); }
  }).listen(8080);

  const b = await chromium.launch({ executablePath: process.env.CHROMIUM });
  const ctx = await b.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1100, height: 1400 } });
  const page = await ctx.newPage();

  for (const [fixture, lang] of [["rtl-broken.html", "fa"], ["schema.html", "en"]]) {
    await page.goto(`https://localhost:8443/${fixture}`);
    await page.addScriptTag({ content: read("i18n.js") });
    await page.addScriptTag({ content: read("audit.js") });
    const payload = await page.evaluate(async (l) => {
      const r = window.__SEO_LENS_AUDIT__();
      await window.__SEO_LENS_AUDIT_HEADERS__(r);
      return {
        lang: l, url: r.url, title: r.title, brand: r.brand, score: r.score,
        counts: r.counts, generatedAt: r.generatedAt,
        issues: r.issues.map((i) => ({ code: i.code, severity: i.severity, cat: i.cat, params: i.params, detailRaw: i.detailRaw, count: i.count, paths: i.paths }))
      };
    }, lang);

    const rp = await ctx.newPage();
    await rp.addInitScript((data) => {
      window.chrome = { storage: { local: {
        get: (k, cb) => cb({ seoLensReport: data }),
        set: () => {}, remove: () => {}
      } } };
    }, payload);
    await rp.goto("http://localhost:8080/report.html");
    await rp.waitForTimeout(600);
    const shot = path.join(__dirname, `report-${lang}.png`);
    await rp.screenshot({ path: shot, fullPage: false });
    const info = await rp.evaluate(() => ({
      dir: document.documentElement.getAttribute("dir"),
      findings: document.querySelectorAll(".finding").length,
      passes: document.querySelectorAll(".pass-row").length,
      title: document.getElementById("v-title").textContent.slice(0, 40)
    }));
    console.log(`report-${lang}: dir=${info.dir} findings=${info.findings} passes=${info.passes} → ${shot}`);
    await rp.close();
  }
  await b.close(); tls.close(); files.close();
})();
