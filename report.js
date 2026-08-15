/*  SEO Lens — SEO issues, highlighted on the page
 *  hassan mode : on
 *  https://github.com/hassan95eb/seo-extension
 */
/* SEO Lens — printable report page */
(function () {
  const I18N = window.__SEO_LENS_I18N__;
  const SEV_KEY = { error: "sevError", warning: "sevWarning", info: "sevInfo", pass: "sevPass" };
  const $ = (id) => document.getElementById(id);

  let data = null;
  let lang = "fa";
  let customLogo = null;

  const t = (k, p) => I18N.ui(lang, k, p);
  const scoreColor = (s) => (s >= 85 ? "#16a34a" : s >= 65 ? "#65a30d" : s >= 45 ? "#d97706" : "#dc2626");
  const esc = (s) => String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  function fmtDate(iso) {
    try {
      const d = new Date(iso);
      const locale = lang === "fa" ? "fa-IR" : "en-GB";
      return d.toLocaleDateString(locale, { year: "numeric", month: "long", day: "numeric" }) +
        " — " + d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
    } catch (e) { return iso || ""; }
  }

  function render() {
    if (!data) return;
    const pack = I18N.UI[lang];
    document.documentElement.setAttribute("dir", pack.dir);
    document.documentElement.setAttribute("lang", pack.lang);
    document.title = `${t("rTitle")} — ${data.brand ? data.brand.siteName : ""}`;

    // toolbar
    $("btn-print").textContent = t("rPrint");
    $("lbl-logo-text").textContent = t("rLogo");
    $("btn-logo-clear").textContent = t("rLogoClear");
    $("tb-hint").textContent = t("rHint");

    // header
    const brand = data.brand || {};
    const logo = $("brand-logo");
    const src = customLogo || brand.icon || "";
    if (src) { logo.src = src; logo.hidden = false; logo.onerror = () => { logo.hidden = true; }; }
    else logo.hidden = true;
    $("site-name").textContent = brand.siteName || brand.host || "";
    $("site-url").textContent = data.url || brand.host || "";
    $("rep-kicker").textContent = t("rTitle");
    $("rep-date").textContent = fmtDate(data.generatedAt);

    // score
    const col = scoreColor(data.score);
    $("gauge").style.background = `conic-gradient(${col} ${data.score * 3.6}deg, #e2e8f0 0deg)`;
    $("score").textContent = data.score;
    $("score").style.color = col;
    $("score-of").textContent = t("rOf100");

    $("c-err").textContent = data.counts.errors;
    $("c-warn").textContent = data.counts.warnings;
    $("c-info").textContent = data.counts.infos;
    $("c-pass").textContent = data.counts.passes;
    $("l-err").textContent = t("rErrors");
    $("l-warn").textContent = t("rWarnings");
    $("l-info").textContent = t("rInfos");
    $("l-pass").textContent = t("rPasses");

    $("k-title").textContent = t("rPageTitle");
    $("v-title").textContent = data.title || "—";
    $("k-url").textContent = t("rUrl");
    $("v-url").textContent = data.url || "";

    // findings
    const findings = data.issues.filter((i) => i.severity !== "pass");
    const passes = data.issues.filter((i) => i.severity === "pass");

    $("sec-details").textContent = t("rDetails");
    $("findings").innerHTML = findings.length
      ? findings.map(renderFinding).join("")
      : `<p class="f-desc">${esc(t("rNoIssues"))}</p>`;

    $("sec-good").textContent = passes.length ? t("rGoodJob") : "";
    $("sec-good").classList.toggle("hidden", !passes.length);
    $("passes").innerHTML = passes.map((i) => {
      const m = I18N.issue(lang, i.code, i.params);
      return `<div class="pass-row"><span class="tick">✓</span><span>${esc(m.t)}</span>
        ${i.detailRaw ? `<span class="sub"><bdi>${esc(String(i.detailRaw).slice(0, 90))}</bdi></span>` : ""}</div>`;
    }).join("");

    $("foot-text").textContent = t("rFooter");
    $("foot-url").textContent = data.url || "";
  }

  function renderFinding(i) {
    const m = I18N.issue(lang, i.code, i.params);
    const els = (i.paths || []).slice(0, 8);
    const more = (i.count || 0) - els.length;
    const detail = m.d
      ? esc(m.d) + (i.detailRaw ? ` — <bdi>${esc(i.detailRaw)}</bdi>` : "")
      : (i.detailRaw ? `<bdi>${esc(i.detailRaw)}</bdi>` : "");
    return `
    <div class="finding ${i.severity}">
      <div class="f-top">
        <span class="f-badge">${esc(t(SEV_KEY[i.severity]))}</span>
        <span class="f-title">${esc(m.t)}</span>
        <span class="f-cat">${esc(t("cat" + i.cat))}</span>
      </div>
      ${detail ? `<p class="f-desc">${detail}</p>` : ""}
      ${m.f ? `<p class="f-fix"><b>${esc(t("rFix"))}:</b> ${esc(m.f)}</p>` : ""}
      ${els.length ? `<ul class="f-els">${els.map((p) =>
        `<li><span class="p"><bdi>${esc(p.path)}</bdi></span><span class="s"><bdi>${esc(p.text || "")}</bdi></span></li>`
      ).join("")}${more > 0 ? `<li class="f-more">+ ${more}</li>` : ""}</ul>` : ""}
    </div>`;
  }

  /* ---------- events ---------- */
  $("btn-print").addEventListener("click", () => window.print());
  $("btn-lang").addEventListener("click", () => {
    lang = lang === "fa" ? "en" : "fa";
    chrome.storage.local.set({ seoLensLang: lang });
    render();
  });
  $("file-logo").addEventListener("change", (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const rd = new FileReader();
    rd.onload = () => {
      customLogo = rd.result;
      chrome.storage.local.set({ seoLensLogo: customLogo });
      render();
    };
    rd.readAsDataURL(f);
  });
  $("btn-logo-clear").addEventListener("click", () => {
    customLogo = null;
    chrome.storage.local.remove("seoLensLogo");
    render();
  });

  /* ---------- load ---------- */
  const key = new URLSearchParams(location.search).get("k") || "seoLensReport";
  chrome.storage.local.get([key, "seoLensLogo", "seoLensLang"], (r) => {
    data = r[key] || null;
    customLogo = r.seoLensLogo || null;
    lang = (data && data.lang) || r.seoLensLang || "fa";
    if (!data) {
      document.getElementById("sheet").innerHTML = "<p style='padding:40px;text-align:center'>No report data.</p>";
      return;
    }
    render();
  });
})();
