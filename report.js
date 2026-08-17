/*  SEO Lens — SEO issues, highlighted on the page
 *  hassan mode : on
 *  https://github.com/hassan95eb/seo-extension
 */
/* SEO Lens — printable report page */
(function () {
  const I18N = window.__SEO_LENS_I18N__;
  const SEV_KEY = {
    error: "sevError", warning: "sevWarning", info: "sevInfo", pass: "sevPass", stat: "sevStat"
  };
  const $ = (id) => document.getElementById(id);

  // Must match detectLang() in content.js, so the panel and this page never disagree.
  const detectLang = () => ((navigator.language || "").toLowerCase().startsWith("fa") ? "fa" : "en");

  let data = null;
  let lang = detectLang();
  let customLogo = null;

  const t = (k, p) => I18N.ui(lang, k, p);
  const scoreColor = (s) => (s >= 85 ? "#16a34a" : s >= 65 ? "#65a30d" : s >= 45 ? "#d97706" : "#dc2626");
  const esc = (s) => String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  // brand.icon is taken from the audited page, i.e. it is untrusted input arriving on
  // an extension page. Only real image sources are allowed through to the DOM.
  function safeImageSrc(src) {
    if (!src) return "";
    const s = String(src).trim();
    if (/^data:image\//i.test(s)) return s;
    try {
      const u = new URL(s, location.href);
      return (u.protocol === "http:" || u.protocol === "https:") ? u.href : "";
    } catch (e) { return ""; }
  }

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
    const src = safeImageSrc(customLogo || brand.icon || "");
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
      ? findings.map((f, idx) => renderFinding(f, idx)).join("")
      : `<p class="f-desc">${esc(t("rNoIssues"))}</p>`;

    $("sec-good").textContent = passes.length ? t("rGoodJob") : "";
    $("sec-good").classList.toggle("hidden", !passes.length);
    $("passes").innerHTML = passes.map((i) => {
      const m = I18N.issue(lang, i.code, i.params);
      return `<div class="pass-row"><span class="tick">✓</span><span>${esc(m.t)}</span>
        ${i.detailRaw ? `<span class="sub"><bdi dir="auto">${esc(String(i.detailRaw).slice(0, 90))}</bdi></span>` : ""}</div>`;
    }).join("");

    $("foot-text").textContent = t("rFooter");
    $("foot-url").textContent = data.url || "";

    bindMoreButtons();
  }

  // How many element rows are printed before the "show more" toggle appears.
  const PATHS_PREVIEW = 10;

  const elRow = (p) =>
    `<li><span class="p"><bdi>${esc(p.path)}</bdi></span><span class="s"><bdi dir="auto">${esc(p.text || "")}</bdi></span></li>`;

  function renderFinding(i, idx) {
    const m = I18N.issue(lang, i.code, i.params);
    const all = i.paths || [];
    const first = all.slice(0, PATHS_PREVIEW);
    const rest = all.slice(PATHS_PREVIEW);
    const detail = m.d
      ? esc(m.d) + (i.detailRaw ? ` — <bdi dir="auto">${esc(i.detailRaw)}</bdi>` : "")
      : (i.detailRaw ? `<bdi dir="auto">${esc(i.detailRaw)}</bdi>` : "");
    return `
    <div class="finding ${i.severity}">
      <div class="f-top">
        <span class="f-badge">${esc(t(SEV_KEY[i.severity]))}</span>
        <span class="f-title">${esc(m.t)}</span>
        <span class="f-cat">${esc(t("cat" + i.cat))}</span>
      </div>
      ${detail ? `<p class="f-desc">${detail}</p>` : ""}
      ${m.f ? `<p class="f-fix"><b>${esc(t("rFix"))}:</b> ${esc(m.f)}</p>` : ""}
      ${first.length ? `<ul class="f-els">${first.map(elRow).join("")}</ul>` : ""}
      ${rest.length ? `<ul class="f-els f-els-rest" id="rest-${idx}" hidden>${rest.map(elRow).join("")}</ul>
        <button class="f-more-btn no-print" data-target="rest-${idx}"
                data-more="${esc(t("moreItems", { n: rest.length }))}"
                data-less="${esc(t("lessItems"))}">${esc(t("moreItems", { n: rest.length }))}</button>` : ""}
    </div>`;
  }

  // Collapsed lists are inert markup until this runs; print styles reveal them anyway,
  // so an un-expanded report still exports complete.
  function bindMoreButtons() {
    document.querySelectorAll(".f-more-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const list = document.getElementById(btn.dataset.target);
        if (!list) return;
        const opening = list.hasAttribute("hidden");
        if (opening) list.removeAttribute("hidden"); else list.setAttribute("hidden", "");
        btn.textContent = opening ? btn.dataset.less : btn.dataset.more;
      });
    });
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
  // The payload is read once and then deleted from chrome.storage, so an audited page's
  // URL and text snippets never linger on disk. A per-tab sessionStorage copy keeps the
  // report survivable across a reload of this tab, and disappears when the tab is closed.
  const SESSION_KEY = "seoLensReportData";
  const key = new URLSearchParams(location.search).get("k") || "seoLensReport";

  function readSession() {
    try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null"); }
    catch (e) { return null; }
  }
  function writeSession(payload) {
    try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(payload)); }
    catch (e) { /* quota or disabled storage — the in-memory copy still renders */ }
  }

  chrome.storage.local.get([key, "seoLensLogo", "seoLensLang"], (r) => {
    data = r[key] || readSession();
    customLogo = r.seoLensLogo || null;
    lang = (data && data.lang) || r.seoLensLang || detectLang();

    if (r[key]) {
      writeSession(r[key]);
      chrome.storage.local.remove(key);
    }
    if (!data) {
      document.getElementById("sheet").innerHTML = "<p style='padding:40px;text-align:center'>No report data.</p>";
      return;
    }
    render();
  });
})();
