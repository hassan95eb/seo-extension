/*  SEO Lens — SEO issues, highlighted on the page
 *  hassan mode : on
 *  https://github.com/hassan95eb/seo-extension
 */
/* SEO Lens — panel, on-page highlighting and report export */
(function () {
  if (window.__SEO_LENS_LOADED__) return;
  window.__SEO_LENS_LOADED__ = true;

  const I18N = window.__SEO_LENS_I18N__;
  const HOST_ID = "seo-lens-root-" + Math.random().toString(36).slice(2, 8);
  const SEV_META = {
    error: { color: "#ef4444", bg: "rgba(239,68,68,.12)", icon: "✕", uiKey: "sevError" },
    warning: { color: "#f59e0b", bg: "rgba(245,158,11,.12)", icon: "!", uiKey: "sevWarning" },
    info: { color: "#3b82f6", bg: "rgba(59,130,246,.12)", icon: "i", uiKey: "sevInfo" },
    pass: { color: "#22c55e", bg: "rgba(34,197,94,.12)", icon: "✓", uiKey: "sevPass" },
    // Neutral measurements — no colour weight, no filter chip, no effect on the score.
    stat: { color: "#64748b", bg: "rgba(100,116,139,.12)", icon: "≡", uiKey: "sevStat" }
  };

  let host, shadow, panelOpen = false, report = null;
  let overlayHost, overlayShadow, overlayLayer;
  let tracked = [], rafPending = false;
  let activeIssueId = null, highlightAllOn = false, filter = "all";
  let lang = "fa";

  const SIGN = "hassan mode : on";
  const SIGN_URL = "https://github.com/hassan95eb/seo-extension";

  const t = (key, params) => I18N.ui(lang, key, params);
  const tIssue = (issue) => I18N.issue(lang, issue.code, issue.params);

  /* ---------- language ---------- */
  // Shared with report.js: both sides must fall back to the same detection, otherwise
  // the panel and the PDF report can end up in different languages.
  const detectLang = () => ((navigator.language || "").toLowerCase().startsWith("fa") ? "fa" : "en");

  function loadLang(cb) {
    try {
      chrome.storage.local.get(["seoLensLang"], (r) => {
        const stored = r && r.seoLensLang;
        if (stored === "fa" || stored === "en") {
          lang = stored;
        } else {
          lang = detectLang();
          // Persist the detected value straight away so every other surface
          // (report page included) reads the same answer instead of guessing again.
          saveLang();
        }
        cb && cb();
      });
    } catch (e) { cb && cb(); }
  }
  function saveLang() {
    try { chrome.storage.local.set({ seoLensLang: lang }); } catch (e) { /* ignore */ }
  }

  /* ---------- highlight layer ---------- */
  function ensureOverlay() {
    if (overlayLayer && document.documentElement.contains(overlayHost)) return;
    overlayHost = document.createElement("div");
    overlayHost.id = HOST_ID + "-ov";
    overlayHost.style.cssText = "all:initial;position:absolute;top:0;left:0;width:0;height:0;z-index:2147483646;";
    overlayShadow = overlayHost.attachShadow({ mode: "open" });
    const st = document.createElement("style");
    st.textContent = `
      .layer{position:absolute;top:0;left:0;width:0;height:0;pointer-events:none;}
      .box{position:absolute;box-sizing:border-box;border-radius:4px;pointer-events:none;animation:slfade .25s ease;}
      @keyframes slfade{from{opacity:0}to{opacity:1}}
      .tag{position:absolute;transform:translateY(-100%);font:600 11px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",Tahoma,sans-serif;
           color:#fff;padding:2px 7px;border-radius:4px 4px 0 0;white-space:nowrap;max-width:340px;
           overflow:hidden;text-overflow:ellipsis;pointer-events:none;unicode-bidi:isolate;}
      .pulse{animation:slpulse 1.2s ease 2;}
      @keyframes slpulse{0%,100%{box-shadow:0 0 0 0 rgba(239,68,68,0)}50%{box-shadow:0 0 0 8px rgba(239,68,68,.25)}}
    `;
    overlayLayer = document.createElement("div");
    overlayLayer.className = "layer";
    overlayShadow.append(st, overlayLayer);
    document.documentElement.appendChild(overlayHost);
  }

  function clearHighlights() {
    tracked = [];
    if (overlayLayer) overlayLayer.textContent = "";
  }

  function drawTracked(pulse) {
    ensureOverlay();
    overlayLayer.textContent = "";
    const sx = window.scrollX, sy = window.scrollY;
    tracked.forEach((tr) => {
      const el = tr.el;
      if (!el || !el.isConnected) return;
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) return;
      const meta = SEV_META[tr.sev] || SEV_META.warning;
      const fill = highlightAllOn ? meta.bg.replace(/,\.\d+\)$/, ",.05)") : meta.bg;
      const box = document.createElement("div");
      box.className = "box" + (pulse ? " pulse" : "");
      box.style.cssText =
        `top:${r.top + sy - 2}px;left:${r.left + sx - 2}px;width:${r.width + 4}px;height:${r.height + 4}px;` +
        `border:2px solid ${meta.color};background:${fill};`;
      overlayLayer.appendChild(box);
      if (tr.label) {
        const tag = document.createElement("div");
        tag.className = "tag";
        tag.style.cssText = `top:${r.top + sy - 2}px;left:${r.left + sx - 2}px;background:${meta.color};direction:${I18N.UI[lang].dir};`;
        tag.textContent = tr.label;
        overlayLayer.appendChild(tag);
      }
    });
  }

  function scheduleRedraw() {
    if (rafPending || !tracked.length) return;
    rafPending = true;
    requestAnimationFrame(() => { rafPending = false; drawTracked(false); });
  }
  window.addEventListener("scroll", scheduleRedraw, true);
  window.addEventListener("resize", scheduleRedraw);

  function highlightIssue(issue, scroll) {
    highlightAllOn = false;
    activeIssueId = issue.id;
    clearHighlights();
    const list = (issue.els || []).filter((e) => {
      if (!e || !e.isConnected) return false;
      const r = e.getBoundingClientRect();
      return r.width > 0 || r.height > 0;
    });
    if (!list.length) return false;
    const label = tIssue(issue).t;
    tracked = list.slice(0, 60).map((el, i) => ({
      el, sev: issue.severity, label: list.length > 1 ? `${i + 1}. ${label}` : label
    }));
    drawTracked(true);
    if (scroll) {
      try { list[0].scrollIntoView({ behavior: "smooth", block: "center" }); }
      catch (e) { list[0].scrollIntoView(); }
      setTimeout(() => drawTracked(true), 450);
    }
    return true;
  }

  function highlightAll() {
    if (!report) return;
    highlightAllOn = !highlightAllOn;
    activeIssueId = null;
    clearHighlights();
    if (!highlightAllOn) { renderList(); return; }
    let n = 0;
    report.issues
      .filter((i) => i.severity === "error" || i.severity === "warning")
      .forEach((issue) => {
        const label = tIssue(issue).t;
        (issue.els || []).forEach((el) => {
          if (!el || !el.isConnected || n >= 150) return;
          const r = el.getBoundingClientRect();
          if (r.width === 0 && r.height === 0) return;
          n++;
          tracked.push({ el, sev: issue.severity, label: `${n}. ${label}` });
        });
      });
    drawTracked(true);
    renderList();
  }

  /* ---------- audit ---------- */
  function pushScore() {
    if (!report) return;
    try {
      chrome.runtime.sendMessage({
        type: "SEO_LENS_SCORE", errors: report.counts.errors, warnings: report.counts.warnings
      });
    } catch (e) { /* ignore */ }
  }

  function runAudit() {
    try { report = window.__SEO_LENS_AUDIT__(); }
    catch (e) { console.error("SEO Lens:", e); report = null; }
    pushScore();
  }

  // The header checks need a network round-trip, so they run after the panel has already
  // painted the synchronous findings. `token` guards against a re-scan landing out of order.
  let auditToken = 0;
  function runHeaderAudit() {
    if (!report || !window.__SEO_LENS_AUDIT_HEADERS__) return;
    const token = ++auditToken;
    const target = report;
    window.__SEO_LENS_AUDIT_HEADERS__(report)
      .then(() => {
        if (token !== auditToken || report !== target) return;
        pushScore();
        renderAll();
      })
      .catch((e) => console.debug("SEO Lens headers:", e));
  }

  /* ---------- report export ---------- */
  function serializeReport() {
    return {
      lang,
      url: report.url,
      title: report.title,
      brand: report.brand,
      score: report.score,
      counts: report.counts,
      generatedAt: report.generatedAt,
      issues: report.issues.map((i) => ({
        code: i.code, severity: i.severity, cat: i.cat, params: i.params,
        detailRaw: i.detailRaw, count: i.count, paths: i.paths
      }))
    };
  }

  const REPORT_PREFIX = "seoLensReport:";

  // Report payloads carry the audited URL plus text snippets from the page, so they
  // are treated as a hand-off buffer, not as saved data: each report gets its own key,
  // any leftovers from earlier runs are swept first, and report.js deletes the key as
  // soon as it has read it.
  function sweepOldReports(cb) {
    try {
      chrome.storage.local.get(null, (all) => {
        const stale = Object.keys(all || {}).filter(
          (k) => k === "seoLensReport" || k.indexOf(REPORT_PREFIX) === 0
        );
        if (stale.length) chrome.storage.local.remove(stale, cb);
        else cb();
      });
    } catch (e) { cb(); }
  }

  function openPdfReport() {
    if (!report) return;
    const key = REPORT_PREFIX + Date.now() + "-" + Math.random().toString(36).slice(2, 8);
    const payload = serializeReport();
    try {
      sweepOldReports(() => {
        chrome.storage.local.set({ [key]: payload }, () => {
          chrome.runtime.sendMessage({ type: "SEO_LENS_OPEN_REPORT", key });
          flash(t("pdfOpening"));
        });
      });
    } catch (e) {
      console.error("SEO Lens:", e);
    }
  }

  function copyReport() {
    if (!report) return;
    const lines = [
      `${t("rTitle")} — ${report.title || document.title}`,
      report.url,
      `${t("rScore")}: ${report.score}/100`,
      t("summary", { e: report.counts.errors, w: report.counts.warnings, i: report.counts.infos, p: report.counts.passes }),
      ""
    ];
    report.issues.forEach((i) => {
      if (i.severity === "pass") return;
      const m = tIssue(i);
      lines.push(`[${t(SEV_META[i.severity].uiKey)}] ${m.t}`);
      if (m.d || i.detailRaw) lines.push(`   ${[m.d, i.detailRaw].filter(Boolean).join(" — ")}`);
      if (m.f) lines.push(`   ${t("fixLabel")} ${m.f}`);
      (i.paths || []).slice(0, 5).forEach((p) => lines.push(`   ↳ ${p.path}`));
      lines.push("");
    });
    lines.push(`— ${SIGN} · github.com/hassan95eb/seo-extension`);
    navigator.clipboard.writeText(lines.join("\n")).then(
      () => flash(t("copied")), () => flash(t("copyFail"))
    );
  }

  /* ---------- panel ---------- */
  function buildPanel() {
    host = document.createElement("div");
    host.id = HOST_ID;
    host.style.cssText = "all:initial;position:fixed;top:0;left:0;width:0;height:0;z-index:2147483647;";
    shadow = host.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = PANEL_CSS;
    const wrap = document.createElement("div");
    wrap.className = "panel";
    wrap.id = "sl-panel";
    shadow.append(style, wrap);
    document.documentElement.appendChild(host);
    renderChrome();

    // drag to move the panel
    let dragging = false, sx0 = 0, sy0 = 0, ox = 0, oy = 0;
    shadow.addEventListener("mousedown", (e) => {
      const h = e.target.closest && e.target.closest(".sl-head");
      if (!h || e.target.closest("button")) return;
      dragging = true;
      const r = wrap.getBoundingClientRect();
      sx0 = e.clientX; sy0 = e.clientY; ox = r.left; oy = r.top;
      e.preventDefault();
    });
    window.addEventListener("mousemove", (e) => {
      if (!dragging) return;
      wrap.style.left = Math.max(0, Math.min(window.innerWidth - 200, ox + e.clientX - sx0)) + "px";
      wrap.style.top = Math.max(0, Math.min(window.innerHeight - 60, oy + e.clientY - sy0)) + "px";
      wrap.style.right = "auto";
      wrap.style.bottom = "auto";
    });
    window.addEventListener("mouseup", () => { dragging = false; });
  }

  function renderChrome() {
    const wrap = shadow.querySelector("#sl-panel");
    wrap.setAttribute("dir", I18N.UI[lang].dir);
    wrap.innerHTML = `
      <div class="sl-head">
        <div class="sl-brand">
          <div class="sl-ring" id="sl-ring"><div class="sl-ring-in"><span id="sl-score">–</span></div></div>
          <div>
            <div class="sl-name">${t("appName")}</div>
            <div class="sl-sub" id="sl-sub">${t("analyzing")}</div>
          </div>
        </div>
        <div class="sl-actions">
          <button id="sl-lang" title="Language">${t("langBtn")}</button>
          <button id="sl-rescan" title="${t("rescan")}">⟳</button>
          <button id="sl-close" title="${t("close")}">✕</button>
        </div>
      </div>
      <div class="sl-tools">
        <button id="sl-hl-all">${t("hlAll")}</button>
        <button id="sl-clear">${t("clear")}</button>
      </div>
      <div class="sl-tools">
        <button id="sl-pdf" class="primary">${t("pdf")}</button>
        <button id="sl-copy">${t("copy")}</button>
      </div>
      <div class="sl-filters">
        <button class="sl-filter" data-f="all">${t("fAll")}</button>
        <button class="sl-filter e" data-f="error">${t("fError")} <span id="sl-cnt-error">0</span></button>
        <button class="sl-filter w" data-f="warning">${t("fWarn")} <span id="sl-cnt-warning">0</span></button>
        <button class="sl-filter i" data-f="info">${t("fInfo")} <span id="sl-cnt-info">0</span></button>
        <button class="sl-filter p" data-f="pass">${t("fPass")} <span id="sl-cnt-pass">0</span></button>
      </div>
      <div class="sl-body" id="sl-body"></div>
      <div class="sl-foot">
        <span>${t("foot")}</span>
        <a class="sl-sign" href="${SIGN_URL}" target="_blank" rel="noopener noreferrer">${SIGN}</a>
      </div>
      <div class="sl-flash" id="sl-flash"></div>`;

    shadow.querySelector("#sl-close").addEventListener("click", closePanel);
    shadow.querySelector("#sl-rescan").addEventListener("click", () => {
      clearHighlights(); highlightAllOn = false; runAudit(); renderAll(); runHeaderAudit();
    });
    shadow.querySelector("#sl-lang").addEventListener("click", () => {
      lang = lang === "fa" ? "en" : "fa";
      saveLang();
      renderChrome();
      renderAll();
      if (tracked.length) drawTracked(false);
    });
    shadow.querySelector("#sl-hl-all").addEventListener("click", highlightAll);
    shadow.querySelector("#sl-clear").addEventListener("click", () => {
      clearHighlights(); highlightAllOn = false; activeIssueId = null; renderList();
    });
    shadow.querySelector("#sl-copy").addEventListener("click", copyReport);
    shadow.querySelector("#sl-pdf").addEventListener("click", openPdfReport);
    shadow.querySelectorAll(".sl-filter").forEach((b) => {
      b.classList.toggle("on", b.dataset.f === filter);
      b.addEventListener("click", () => {
        filter = b.dataset.f;
        shadow.querySelectorAll(".sl-filter").forEach((x) => x.classList.toggle("on", x === b));
        renderList();
      });
    });
  }

  const scoreColor = (s) => (s >= 85 ? "#22c55e" : s >= 65 ? "#84cc16" : s >= 45 ? "#f59e0b" : "#ef4444");
  const esc = (s) => String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  function renderAll() {
    if (!shadow) return;
    if (!report) {
      shadow.querySelector("#sl-body").innerHTML = `<div class="sl-empty">${t("failed")}</div>`;
      return;
    }
    const c = report.counts;
    const sc = shadow.querySelector("#sl-score");
    sc.textContent = report.score;
    sc.style.color = scoreColor(report.score);
    shadow.querySelector("#sl-ring").style.background =
      `conic-gradient(${scoreColor(report.score)} ${report.score * 3.6}deg, rgba(255,255,255,.08) 0deg)`;
    shadow.querySelector("#sl-sub").textContent =
      t("summary", { e: c.errors, w: c.warnings, i: c.infos, p: c.passes });
    shadow.querySelector("#sl-cnt-error").textContent = c.errors;
    shadow.querySelector("#sl-cnt-warning").textContent = c.warnings;
    shadow.querySelector("#sl-cnt-info").textContent = c.infos;
    shadow.querySelector("#sl-cnt-pass").textContent = c.passes;
    renderList();
  }

  function renderList() {
    if (!shadow || !report) return;
    const body = shadow.querySelector("#sl-body");
    const items = report.issues.filter((i) => (filter === "all" ? true : i.severity === filter));
    const hlBtn = shadow.querySelector("#sl-hl-all");
    hlBtn.classList.toggle("on", highlightAllOn);
    hlBtn.textContent = highlightAllOn ? t("hlAllOff") : t("hlAll");

    if (!items.length) {
      body.innerHTML = `<div class="sl-empty">${t("empty")}</div>`;
      return;
    }
    body.innerHTML = items.map((i) => {
      const m = SEV_META[i.severity];
      const msg = tIssue(i);
      const canHl = i.count && i.highlightable;
      // p.text is text lifted off the audited page: it can be RTL, LTR or mixed, and it
      // must never reorder against the panel's own direction. bdi + dir="auto" gives it
      // its own embedding level regardless of which language the UI is in.
      const targets = (i.paths || []).slice(0, 6).map(
        (p) => `<li><span class="sl-path"><bdi>${esc(p.path)}</bdi></span>` +
               `${p.text ? `<span class="sl-snip"><bdi dir="auto">${esc(p.text)}</bdi></span>` : ""}</li>`
      ).join("");
      const detail = msg.d
        ? esc(msg.d) + (i.detailRaw ? ` — <bdi dir="auto">${esc(i.detailRaw)}</bdi>` : "")
        : (i.detailRaw ? `<bdi dir="auto">${esc(i.detailRaw)}</bdi>` : "");
      return `
      <div class="sl-item ${i.severity} ${activeIssueId === i.id ? "active" : ""}" data-id="${i.id}">
        <div class="sl-row">
          <span class="sl-dot" style="background:${m.color}">${m.icon}</span>
          <div class="sl-txt">
            <div class="sl-title">${esc(msg.t)}</div>
            <div class="sl-cat">${esc(t("cat" + i.cat))}${i.count ? ` · ${t("elements", { n: i.count })}` : ""}</div>
          </div>
          <button class="sl-caret">▾</button>
        </div>
        <div class="sl-detail">
          ${detail ? `<p class="sl-desc">${detail}</p>` : ""}
          ${msg.f ? `<p class="sl-fix"><b>${esc(t("fixLabel"))}</b> ${esc(msg.f)}</p>` : ""}
          ${targets ? `<ul class="sl-targets">${targets}</ul>` : ""}
          ${canHl
            ? `<button class="sl-hl">${esc(t("showOnPage"))}</button>`
            : (i.count
                ? `<span class="sl-note">${esc(t("inHead"))}</span>`
                : `<span class="sl-note">${esc(t("pageLevel"))}</span>`)}
        </div>
      </div>`;
    }).join("");

    body.querySelectorAll(".sl-item").forEach((node) => {
      const issue = report.issues.find((x) => x.id === node.dataset.id);
      node.querySelector(".sl-row").addEventListener("click", () => {
        const open = node.classList.toggle("open");
        if (open && issue) {
          const ok = highlightIssue(issue, true);
          body.querySelectorAll(".sl-item").forEach((n) => n.classList.toggle("active", n === node && ok));
        }
      });
      const btn = node.querySelector(".sl-hl");
      if (btn) {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          highlightIssue(issue, true);
          body.querySelectorAll(".sl-item").forEach((n) => n.classList.toggle("active", n === node));
        });
      }
    });
  }

  function flash(msg) {
    const el = shadow && shadow.querySelector("#sl-flash");
    if (!el) return;
    el.textContent = msg;
    el.classList.add("show");
    setTimeout(() => el.classList.remove("show"), 1800);
  }

  function openPanel() {
    loadLang(() => {
      if (!host) buildPanel(); else renderChrome();
      host.style.display = "";
      runAudit();
      renderAll();
      runHeaderAudit();
      panelOpen = true;
    });
  }

  function closePanel() {
    panelOpen = false;
    clearHighlights();
    highlightAllOn = false;
    if (host) host.style.display = "none";
    if (overlayHost) overlayHost.remove();
    overlayLayer = null;
  }

  const toggle = () => (panelOpen ? closePanel() : openPanel());

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (!msg) return;
    if (msg.type === "SEO_LENS_PING") { sendResponse({ ok: true }); return true; }
    if (msg.type === "SEO_LENS_TOGGLE") { toggle(); sendResponse({ ok: true }); return true; }
  });

  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && panelOpen) closePanel(); });

  const PANEL_CSS = `
  :host{all:initial;}
  *{box-sizing:border-box;}
  .panel{
    position:fixed;top:16px;right:16px;width:380px;max-height:calc(100vh - 32px);
    display:flex;flex-direction:column;
    font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Vazirmatn,Tahoma,sans-serif;
    background:#0f172a;color:#e2e8f0;border:1px solid #1e293b;border-radius:14px;
    box-shadow:0 24px 60px rgba(0,0,0,.45);overflow:hidden;font-size:13px;
  }
  .sl-head{display:flex;align-items:center;justify-content:space-between;padding:12px 14px;
    background:linear-gradient(180deg,#111c33,#0f172a);border-bottom:1px solid #1e293b;cursor:move;user-select:none;}
  .sl-brand{display:flex;align-items:center;gap:10px;}
  .sl-ring{width:44px;height:44px;border-radius:50%;display:grid;place-items:center;
    background:conic-gradient(#334155 0deg,rgba(255,255,255,.08) 0deg);}
  .sl-ring-in{width:36px;height:36px;border-radius:50%;background:#0f172a;display:grid;place-items:center;}
  #sl-score{font-weight:800;font-size:15px;color:#94a3b8;}
  .sl-name{font-weight:700;font-size:14px;}
  .sl-sub{font-size:11px;color:#94a3b8;margin-top:2px;}
  .sl-actions{display:flex;gap:6px;}
  .sl-actions button{background:#1e293b;border:none;color:#cbd5e1;min-width:28px;height:28px;padding:0 6px;
    border-radius:8px;cursor:pointer;font-size:12px;line-height:1;font-family:inherit;font-weight:600;}
  .sl-actions button:hover{background:#334155;color:#fff;}
  .sl-tools{display:flex;gap:6px;padding:8px 12px 0;}
  .sl-tools:last-of-type{padding-bottom:2px;}
  .sl-tools button{flex:1;background:#1e293b;border:1px solid #263449;color:#cbd5e1;padding:7px 6px;
    border-radius:8px;cursor:pointer;font-size:11.5px;font-family:inherit;}
  .sl-tools button:hover{background:#263449;color:#fff;}
  .sl-tools button.on{background:#7c3aed;border-color:#7c3aed;color:#fff;}
  .sl-tools button.primary{background:#0e7490;border-color:#0e7490;color:#fff;font-weight:600;}
  .sl-tools button.primary:hover{background:#0891b2;}
  .sl-filters{display:flex;gap:5px;padding:10px 12px;flex-wrap:wrap;}
  .sl-filter{background:transparent;border:1px solid #263449;color:#94a3b8;padding:4px 9px;border-radius:999px;
    cursor:pointer;font-size:11px;font-family:inherit;display:flex;gap:4px;align-items:center;}
  .sl-filter.on{background:#1e293b;color:#e2e8f0;border-color:#3b4a63;}
  .sl-filter.e span{color:#ef4444;font-weight:700;}
  .sl-filter.w span{color:#f59e0b;font-weight:700;}
  .sl-filter.i span{color:#3b82f6;font-weight:700;}
  .sl-filter.p span{color:#22c55e;font-weight:700;}
  .sl-body{overflow-y:auto;padding:0 10px 10px;flex:1;}
  .sl-body::-webkit-scrollbar{width:8px;}
  .sl-body::-webkit-scrollbar-thumb{background:#263449;border-radius:8px;}
  .sl-item{background:#131f36;border:1px solid #1e293b;border-radius:10px;margin-bottom:7px;overflow:hidden;}
  .sl-item.active{border-color:#7c3aed;box-shadow:0 0 0 1px #7c3aed40;}
  .sl-row{display:flex;align-items:flex-start;gap:9px;padding:10px;cursor:pointer;}
  .sl-row:hover{background:#182541;}
  .sl-dot{flex:none;width:18px;height:18px;border-radius:50%;display:grid;place-items:center;
    color:#fff;font-size:11px;font-weight:700;margin-top:1px;}
  .sl-txt{flex:1;min-width:0;}
  .sl-title{font-size:12.5px;line-height:1.6;color:#e2e8f0;font-weight:600;}
  .sl-cat{font-size:10.5px;color:#94a3b8;margin-top:2px;}
  .sl-caret{background:none;border:none;color:#64748b;cursor:pointer;font-size:12px;padding:0 2px;}
  .sl-item.open .sl-caret{transform:rotate(180deg);}
  .sl-detail{display:none;padding:0 10px 10px;border-top:1px solid #1c2841;}
  .sl-item.open .sl-detail{display:block;padding-top:9px;}
  .sl-desc{margin:0 0 6px;font-size:11.5px;color:#b6c2d4;line-height:1.9;}
  .sl-fix{margin:0 0 8px;font-size:11.5px;color:#a5b4fc;line-height:1.9;background:#1a2340;
    padding:7px 9px;border-radius:7px;border-inline-start:3px solid #6366f1;}
  .sl-fix b{color:#c7d2fe;}
  .sl-targets{margin:0 0 8px;padding:0;list-style:none;max-height:150px;overflow:auto;}
  .sl-targets li{font-size:10.5px;padding:4px 6px;background:#0f1a2e;border-radius:5px;margin-bottom:3px;
    display:flex;flex-direction:column;gap:2px;}
  .sl-path{color:#7dd3fc;font-family:ui-monospace,Menlo,Consolas,monospace;direction:ltr;text-align:left;
    white-space:nowrap;overflow:hidden;text-overflow:ellipsis;unicode-bidi:isolate;}
  .sl-snip{color:#64748b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;unicode-bidi:isolate;}
  .sl-title,.sl-desc,.sl-fix{unicode-bidi:isolate;}
  .sl-hl{background:#7c3aed;border:none;color:#fff;padding:6px 12px;border-radius:7px;cursor:pointer;
    font-size:11.5px;font-family:inherit;font-weight:600;}
  .sl-hl:hover{background:#6d28d9;}
  .sl-note{font-size:10.5px;color:#64748b;}
  .sl-empty{padding:34px 16px;text-align:center;color:#64748b;font-size:12px;}
  .sl-foot{padding:8px 12px;border-top:1px solid #1e293b;font-size:10.5px;color:#64748b;text-align:center;
    display:flex;flex-direction:column;gap:3px;}
  .sl-sign{color:#7c3aed;text-decoration:none;font-weight:700;letter-spacing:.3px;direction:ltr;
    font-family:ui-monospace,Menlo,Consolas,monospace;font-size:10px;opacity:.85;}
  .sl-sign:hover{opacity:1;text-decoration:underline;}
  .sl-flash{position:absolute;bottom:44px;left:50%;transform:translateX(-50%) translateY(10px);
    background:#7c3aed;color:#fff;padding:7px 14px;border-radius:999px;font-size:11.5px;opacity:0;
    transition:.2s;pointer-events:none;white-space:nowrap;}
  .sl-flash.show{opacity:1;transform:translateX(-50%) translateY(0);}
  `;
})();
