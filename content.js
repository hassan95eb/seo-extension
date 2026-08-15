/*  SEO Lens — SEO issues, highlighted on the page
 *  hassan mode : on
 *  https://github.com/hassan95eb/seo-extension
 */
/* SEO Lens — panel and on-page highlighting */
(function () {
  if (window.__SEO_LENS_LOADED__) {
    return;
  }
  window.__SEO_LENS_LOADED__ = true;

  const HOST_ID = "seo-lens-root-" + Math.random().toString(36).slice(2, 8);
  const SEV_META = {
    error: { label: "ایراد جدی", color: "#ef4444", bg: "rgba(239,68,68,.12)", icon: "✕" },
    warning: { label: "هشدار", color: "#f59e0b", bg: "rgba(245,158,11,.12)", icon: "!" },
    info: { label: "نکته", color: "#3b82f6", bg: "rgba(59,130,246,.12)", icon: "i" },
    pass: { label: "درست است", color: "#22c55e", bg: "rgba(34,197,94,.12)", icon: "✓" }
  };

  let host, shadow, panelOpen = false, report = null;
  let overlayHost, overlayShadow, overlayLayer;
  let tracked = []; // [{el, sev, label}]
  let rafPending = false;
  let activeIssueId = null;
  let highlightAllOn = false;
  let filter = "all";

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
      .box{position:absolute;box-sizing:border-box;border-radius:4px;pointer-events:none;
           transition:opacity .12s ease; animation: slfade .25s ease;}
      @keyframes slfade{from{opacity:0}to{opacity:1}}
      .tag{position:absolute;transform:translateY(-100%);font:600 11px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",Vazirmatn,Tahoma,sans-serif;
           color:#fff;padding:2px 7px;border-radius:4px 4px 0 0;white-space:nowrap;max-width:340px;
           overflow:hidden;text-overflow:ellipsis;direction:rtl;pointer-events:none;}
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
    tracked.forEach((t) => {
      const el = t.el;
      if (!el || !el.isConnected) return;
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) return;
      const meta = SEV_META[t.sev] || SEV_META.warning;
      const box = document.createElement("div");
      box.className = "box" + (pulse ? " pulse" : "");
      const fill = highlightAllOn ? meta.bg.replace(/,\.\d+\)$/, ",.05)") : meta.bg;
      box.style.cssText =
        `top:${r.top + sy - 2}px;left:${r.left + sx - 2}px;width:${r.width + 4}px;height:${r.height + 4}px;` +
        `border:2px solid ${meta.color};background:${fill};`;
      overlayLayer.appendChild(box);
      if (t.label) {
        const tag = document.createElement("div");
        tag.className = "tag";
        tag.style.cssText = `top:${r.top + sy - 2}px;left:${r.left + sx - 2}px;background:${meta.color};`;
        tag.textContent = t.label;
        overlayLayer.appendChild(tag);
      }
    });
  }

  function scheduleRedraw() {
    if (rafPending || !tracked.length) return;
    rafPending = true;
    requestAnimationFrame(() => {
      rafPending = false;
      drawTracked(false);
    });
  }
  window.addEventListener("scroll", scheduleRedraw, true);
  window.addEventListener("resize", scheduleRedraw);

  /* ---------- highlight a single issue ---------- */
  function highlightIssue(issue, scroll) {
    highlightAllOn = false;
    activeIssueId = issue.id;
    const els = (issue.els || []).filter((e) => e && e.isConnected);
    clearHighlights();
    if (!els.length) return false;
    const list = els.filter((e) => {
      const r = e.getBoundingClientRect();
      return r.width > 0 || r.height > 0;
    });
    if (!list.length) return false;
    tracked = list.slice(0, 60).map((el, i) => ({
      el,
      sev: issue.severity,
      label: list.length > 1 ? `${i + 1}. ${issue.title}` : issue.title
    }));
    drawTracked(true);
    if (scroll) {
      try {
        list[0].scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
      } catch (e) {
        list[0].scrollIntoView();
      }
      setTimeout(() => drawTracked(true), 450);
    }
    return true;
  }

  function highlightAll() {
    if (!report) return;
    highlightAllOn = !highlightAllOn;
    activeIssueId = null;
    clearHighlights();
    if (!highlightAllOn) {
      renderList();
      return;
    }
    let n = 0;
    report.issues
      .filter((i) => i.severity === "error" || i.severity === "warning")
      .forEach((issue) => {
        (issue.els || []).forEach((el) => {
          if (!el || !el.isConnected) return;
          const r = el.getBoundingClientRect();
          if (r.width === 0 && r.height === 0) return;
          if (n >= 150) return;
          n++;
          tracked.push({ el, sev: issue.severity, label: `${n}. ${issue.title}` });
        });
      });
    drawTracked(true);
    renderList();
  }

  /* ---------- run the audit ---------- */
  function runAudit() {
    try {
      report = window.__SEO_LENS_AUDIT__();
    } catch (e) {
      console.error("SEO Lens:", e);
      report = null;
    }
    if (report) {
      try {
        chrome.runtime.sendMessage({
          type: "SEO_LENS_SCORE",
          errors: report.counts.errors,
          warnings: report.counts.warnings
        });
      } catch (e) { /* ignore */ }
    }
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
    wrap.innerHTML = PANEL_HTML;
    shadow.append(style, wrap);
    document.documentElement.appendChild(host);

    shadow.querySelector("#sl-close").addEventListener("click", closePanel);
    shadow.querySelector("#sl-rescan").addEventListener("click", () => {
      clearHighlights();
      highlightAllOn = false;
      runAudit();
      renderAll();
    });
    shadow.querySelector("#sl-hl-all").addEventListener("click", highlightAll);
    shadow.querySelector("#sl-clear").addEventListener("click", () => {
      clearHighlights();
      highlightAllOn = false;
      activeIssueId = null;
      renderList();
    });
    shadow.querySelector("#sl-copy").addEventListener("click", copyReport);
    shadow.querySelectorAll(".sl-filter").forEach((b) => {
      b.addEventListener("click", () => {
        filter = b.dataset.f;
        shadow.querySelectorAll(".sl-filter").forEach((x) => x.classList.toggle("on", x === b));
        renderList();
      });
    });

    // drag to move the panel
    const headEl = shadow.querySelector(".sl-head");
    let dragging = false, sx0 = 0, sy0 = 0, ox = 0, oy = 0;
    headEl.addEventListener("mousedown", (e) => {
      if (e.target.closest("button")) return;
      dragging = true;
      const r = wrap.getBoundingClientRect();
      sx0 = e.clientX; sy0 = e.clientY; ox = r.left; oy = r.top;
      wrap.style.transition = "none";
      e.preventDefault();
    });
    window.addEventListener("mousemove", (e) => {
      if (!dragging) return;
      const nx = Math.max(0, Math.min(window.innerWidth - 200, ox + e.clientX - sx0));
      const ny = Math.max(0, Math.min(window.innerHeight - 60, oy + e.clientY - sy0));
      wrap.style.left = nx + "px";
      wrap.style.top = ny + "px";
      wrap.style.right = "auto";
      wrap.style.bottom = "auto";
    });
    window.addEventListener("mouseup", () => { dragging = false; });
  }

  function scoreColor(s) {
    if (s >= 85) return "#22c55e";
    if (s >= 65) return "#84cc16";
    if (s >= 45) return "#f59e0b";
    return "#ef4444";
  }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function renderAll() {
    if (!shadow) return;
    if (!report) {
      shadow.querySelector("#sl-body").innerHTML = '<div class="sl-empty">تحلیل انجام نشد. صفحه را رفرش کن و دوباره امتحان کن.</div>';
      return;
    }
    const c = report.counts;
    shadow.querySelector("#sl-score").textContent = report.score;
    shadow.querySelector("#sl-score").style.color = scoreColor(report.score);
    shadow.querySelector("#sl-ring").style.background =
      `conic-gradient(${scoreColor(report.score)} ${report.score * 3.6}deg, rgba(255,255,255,.08) 0deg)`;
    shadow.querySelector("#sl-sub").textContent =
      `${c.errors} ایراد جدی · ${c.warnings} هشدار · ${c.infos} نکته · ${c.passes} مورد سالم`;
    shadow.querySelector("#sl-cnt-error").textContent = c.errors;
    shadow.querySelector("#sl-cnt-warning").textContent = c.warnings;
    shadow.querySelector("#sl-cnt-info").textContent = report.issues.filter((i) => i.severity === "info").length;
    shadow.querySelector("#sl-cnt-pass").textContent = c.passes;
    renderList();
  }

  function renderList() {
    if (!shadow || !report) return;
    const body = shadow.querySelector("#sl-body");
    const items = report.issues.filter((i) => filter === "all" ? true : i.severity === filter);
    shadow.querySelector("#sl-hl-all").classList.toggle("on", highlightAllOn);
    shadow.querySelector("#sl-hl-all").textContent = highlightAllOn ? "خاموش کردن هایلایت همه" : "هایلایت همه ایرادها";

    if (!items.length) {
      body.innerHTML = '<div class="sl-empty">در این دسته چیزی پیدا نشد 🎉</div>';
      return;
    }
    body.innerHTML = items.map((i) => {
      const m = SEV_META[i.severity];
      const canHl = i.els && i.els.length && i.highlightable;
      const targets = (i.paths || []).slice(0, 6).map(
        (p) => `<li><span class="sl-path">${esc(p.path)}</span>${p.text ? `<span class="sl-snip">${esc(p.text)}</span>` : ""}</li>`
      ).join("");
      return `
      <div class="sl-item ${i.severity} ${activeIssueId === i.id ? "active" : ""}" data-id="${i.id}">
        <div class="sl-row">
          <span class="sl-dot" style="background:${m.color}">${m.icon}</span>
          <div class="sl-txt">
            <div class="sl-title">${esc(i.title)}</div>
            <div class="sl-cat">${esc(i.category)}${i.count ? ` · ${i.count} المان` : ""}</div>
          </div>
          <button class="sl-caret" aria-label="جزئیات">▾</button>
        </div>
        <div class="sl-detail">
          ${i.detail ? `<p class="sl-desc">${esc(i.detail)}</p>` : ""}
          ${i.fix ? `<p class="sl-fix"><b>راه‌حل:</b> ${esc(i.fix)}</p>` : ""}
          ${targets ? `<ul class="sl-targets">${targets}</ul>` : ""}
          ${canHl
            ? `<button class="sl-hl" data-id="${i.id}">نمایش روی صفحه ↖</button>`
            : (i.els && i.els.length
                ? `<span class="sl-note">این مورد داخل &lt;head&gt; است و روی صفحه دیده نمی‌شود.</span>`
                : `<span class="sl-note">مربوط به کل صفحه است، نه یک المان خاص.</span>`)}
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

  function copyReport() {
    if (!report) return;
    const lines = [
      `گزارش سئو — ${report.title || document.title}`,
      report.url,
      `امتیاز: ${report.score}/100`,
      `${report.counts.errors} ایراد جدی · ${report.counts.warnings} هشدار`,
      ""
    ];
    report.issues.forEach((i) => {
      if (i.severity === "pass") return;
      lines.push(`[${SEV_META[i.severity].label}] ${i.title}`);
      if (i.detail) lines.push(`   ${i.detail}`);
      if (i.fix) lines.push(`   راه‌حل: ${i.fix}`);
      (i.paths || []).slice(0, 5).forEach((p) => lines.push(`   ↳ ${p.path}`));
      lines.push("");
    });
    lines.push("— hassan mode : on · github.com/hassan95eb/seo-extension");
    const text = lines.join("\n");
    navigator.clipboard.writeText(text).then(
      () => flash("گزارش کپی شد ✓"),
      () => flash("کپی نشد — دسترسی کلیپ‌بورد بسته است")
    );
  }

  function flash(msg) {
    const el = shadow.querySelector("#sl-flash");
    el.textContent = msg;
    el.classList.add("show");
    setTimeout(() => el.classList.remove("show"), 1800);
  }

  function openPanel() {
    if (!host) buildPanel();
    host.style.display = "";
    runAudit();
    renderAll();
    panelOpen = true;
  }

  function closePanel() {
    panelOpen = false;
    clearHighlights();
    highlightAllOn = false;
    if (host) host.style.display = "none";
    if (overlayHost) overlayHost.remove();
    overlayLayer = null;
  }

  function toggle() {
    if (panelOpen) closePanel(); else openPanel();
  }

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (!msg) return;
    if (msg.type === "SEO_LENS_PING") { sendResponse({ ok: true }); return true; }
    if (msg.type === "SEO_LENS_TOGGLE") { toggle(); sendResponse({ ok: true }); return true; }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && panelOpen) closePanel();
  });

  /* ---------- markup & styles ---------- */
  const PANEL_HTML = `
  <div class="sl-head">
    <div class="sl-brand">
      <div class="sl-ring" id="sl-ring"><div class="sl-ring-in"><span id="sl-score">–</span></div></div>
      <div>
        <div class="sl-name">SEO Lens</div>
        <div class="sl-sub" id="sl-sub">در حال تحلیل…</div>
      </div>
    </div>
    <div class="sl-actions">
      <button id="sl-rescan" title="تحلیل مجدد">⟳</button>
      <button id="sl-close" title="بستن">✕</button>
    </div>
  </div>
  <div class="sl-tools">
    <button id="sl-hl-all">هایلایت همه ایرادها</button>
    <button id="sl-clear">پاک کردن</button>
    <button id="sl-copy">کپی گزارش</button>
  </div>
  <div class="sl-filters">
    <button class="sl-filter on" data-f="all">همه</button>
    <button class="sl-filter e" data-f="error">جدی <span id="sl-cnt-error">0</span></button>
    <button class="sl-filter w" data-f="warning">هشدار <span id="sl-cnt-warning">0</span></button>
    <button class="sl-filter i" data-f="info">نکته <span id="sl-cnt-info">0</span></button>
    <button class="sl-filter p" data-f="pass">سالم <span id="sl-cnt-pass">0</span></button>
  </div>
  <div class="sl-body" id="sl-body"></div>
  <div class="sl-foot">
    <span>روی هر ایراد کلیک کن تا روی صفحه نشانت بدهد</span>
    <a class="sl-sign" href="https://github.com/hassan95eb" target="_blank" rel="noopener noreferrer">hassan mode : on</a>
  </div>
  <div class="sl-flash" id="sl-flash"></div>`;

  const PANEL_CSS = `
  :host{all:initial;}
  *{box-sizing:border-box;}
  .panel{
    position:fixed;top:16px;right:16px;width:380px;max-height:calc(100vh - 32px);
    display:flex;flex-direction:column;direction:rtl;
    font-family:Vazirmatn,-apple-system,BlinkMacSystemFont,"Segoe UI",Tahoma,sans-serif;
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
  .sl-name{font-weight:700;font-size:14px;letter-spacing:.2px;}
  .sl-sub{font-size:11px;color:#94a3b8;margin-top:2px;}
  .sl-actions{display:flex;gap:6px;}
  .sl-actions button{background:#1e293b;border:none;color:#cbd5e1;width:28px;height:28px;border-radius:8px;
    cursor:pointer;font-size:14px;line-height:1;}
  .sl-actions button:hover{background:#334155;color:#fff;}
  .sl-tools{display:flex;gap:6px;padding:10px 12px 6px;}
  .sl-tools button{flex:1;background:#1e293b;border:1px solid #263449;color:#cbd5e1;padding:7px 6px;
    border-radius:8px;cursor:pointer;font-size:11.5px;font-family:inherit;}
  .sl-tools button:hover{background:#263449;color:#fff;}
  .sl-tools button.on{background:#7c3aed;border-color:#7c3aed;color:#fff;}
  .sl-filters{display:flex;gap:5px;padding:4px 12px 10px;flex-wrap:wrap;}
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
  .sl-detail{display:none;padding:0 10px 10px;border-top:1px solid #1c2841;margin-top:-1px;}
  .sl-item.open .sl-detail{display:block;padding-top:9px;}
  .sl-desc{margin:0 0 6px;font-size:11.5px;color:#b6c2d4;line-height:1.9;}
  .sl-fix{margin:0 0 8px;font-size:11.5px;color:#a5b4fc;line-height:1.9;background:#1a2340;
    padding:7px 9px;border-radius:7px;border-right:3px solid #6366f1;}
  .sl-fix b{color:#c7d2fe;}
  .sl-targets{margin:0 0 8px;padding:0;list-style:none;max-height:150px;overflow:auto;}
  .sl-targets li{font-size:10.5px;padding:4px 6px;background:#0f1a2e;border-radius:5px;margin-bottom:3px;
    display:flex;flex-direction:column;gap:2px;}
  .sl-path{color:#7dd3fc;font-family:ui-monospace,Menlo,Consolas,monospace;direction:ltr;text-align:left;
    white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .sl-snip{color:#64748b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
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
    transition:.2s;pointer-events:none;}
  .sl-flash.show{opacity:1;transform:translateX(-50%) translateY(0);}
  `;
})();
