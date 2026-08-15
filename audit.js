/*  SEO Lens — SEO issues, highlighted on the page
 *  hassan mode : on
 *  https://github.com/hassan95eb/seo-extension
 */
/* SEO Lens — SEO audit engine
 * Language-agnostic: emits code + params + detailRaw only; all display strings live in i18n.js.
 */
(function () {
  if (window.__SEO_LENS_AUDIT__) return;

  const SEV = { ERROR: "error", WARN: "warning", INFO: "info", PASS: "pass" };

  const GENERIC_ANCHORS = [
    "click here", "here", "read more", "more", "link", "this", "learn more", "see more",
    "اینجا", "کلیک کنید", "اینجا کلیک کنید", "بیشتر", "ادامه مطلب", "لینک",
    "بیشتر بخوانید", "جزئیات", "مشاهده"
  ];

  const txt = (s) => (s || "").replace(/\s+/g, " ").trim();

  const isVisible = (el) => {
    if (!el || !el.getBoundingClientRect) return false;
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) return false;
    const st = getComputedStyle(el);
    return st.display !== "none" && st.visibility !== "hidden" && st.opacity !== "0";
  };

  function cssPath(el) {
    if (!el || el.nodeType !== 1) return "";
    if (el.id) return `#${el.id}`;
    const parts = [];
    let node = el, depth = 0;
    while (node && node.nodeType === 1 && depth < 4) {
      let part = node.tagName.toLowerCase();
      if (node.classList && node.classList.length) {
        part += "." + Array.from(node.classList).slice(0, 2).join(".");
      }
      parts.unshift(part);
      node = node.parentElement;
      depth++;
    }
    return parts.join(" › ");
  }

  function snippet(el, max = 90) {
    if (!el) return "";
    if (el.tagName === "IMG") {
      const s = el.getAttribute("src");
      return s ? s.split("?")[0].split("/").pop().slice(0, max) : "<img>";
    }
    if (el.tagName === "META") return (el.getAttribute("content") || "").slice(0, max);
    if (el.tagName === "LINK") return (el.getAttribute("href") || "").slice(0, max);
    const t = txt(el.textContent);
    if (t) return t.length > max ? t.slice(0, max) + "…" : t;
    return "<" + el.tagName.toLowerCase() + ">";
  }

  function aboveFold(el) {
    try {
      return el.getBoundingClientRect().top + window.scrollY < window.innerHeight * 1.2;
    } catch (e) { return false; }
  }

  function siteBranding() {
    const pick = (sel, attr) => {
      const el = document.querySelector(sel);
      return el ? el.getAttribute(attr) : null;
    };
    let icon =
      pick('link[rel="apple-touch-icon" i]', "href") ||
      pick('link[rel="icon" i][sizes]', "href") ||
      pick('link[rel="icon" i]', "href") ||
      pick('link[rel="shortcut icon" i]', "href") ||
      "/favicon.ico";
    try { icon = new URL(icon, location.href).href; } catch (e) { icon = ""; }
    let ogImage = pick('meta[property="og:image" i]', "content");
    try { ogImage = ogImage ? new URL(ogImage, location.href).href : ""; } catch (e) { ogImage = ""; }
    const siteName =
      txt(pick('meta[property="og:site_name" i]', "content")) ||
      txt(pick('meta[name="application-name" i]', "content")) ||
      location.hostname.replace(/^www\./, "");
    return { siteName, icon, ogImage, host: location.hostname };
  }

  function run() {
    const issues = [];
    let idc = 0;
    const add = (o) => issues.push(Object.assign({ id: "i" + ++idc, els: [], params: {}, detailRaw: "" }, o));

    const doc = document;
    const isHttps = location.protocol === "https:";

    /* ---------- Title ---------- */
    const titles = Array.from(doc.querySelectorAll("head title"));
    const title = txt(doc.title);
    if (!titles.length || !title) {
      add({ severity: SEV.ERROR, cat: "core", code: "TITLE_MISSING" });
    } else {
      if (titles.length > 1) {
        add({ severity: SEV.ERROR, cat: "core", code: "TITLE_DUP", params: { n: titles.length }, els: titles.slice(1) });
      }
      const L = title.length;
      if (L < 30) add({ severity: SEV.WARN, cat: "core", code: "TITLE_SHORT", params: { n: L }, detailRaw: title, els: titles });
      else if (L > 60) add({ severity: SEV.WARN, cat: "core", code: "TITLE_LONG", params: { n: L }, detailRaw: title, els: titles });
      else add({ severity: SEV.PASS, cat: "core", code: "TITLE_OK", params: { n: L }, detailRaw: title, els: titles });
    }

    /* ---------- Meta description ---------- */
    const descs = Array.from(doc.querySelectorAll('meta[name="description" i]'));
    const desc = descs.length ? txt(descs[0].getAttribute("content")) : "";
    if (!descs.length || !desc) {
      add({ severity: SEV.ERROR, cat: "core", code: "DESC_MISSING", els: descs });
    } else {
      if (descs.length > 1) {
        add({ severity: SEV.WARN, cat: "core", code: "DESC_DUP", params: { n: descs.length }, els: descs.slice(1) });
      }
      const L = desc.length;
      if (L < 70) add({ severity: SEV.WARN, cat: "core", code: "DESC_SHORT", params: { n: L }, detailRaw: desc, els: descs });
      else if (L > 160) add({ severity: SEV.WARN, cat: "core", code: "DESC_LONG", params: { n: L }, detailRaw: desc, els: descs });
      else add({ severity: SEV.PASS, cat: "core", code: "DESC_OK", params: { n: L }, detailRaw: desc, els: descs });
    }

    /* ---------- Headings ---------- */
    const h1s = Array.from(doc.querySelectorAll("h1"));
    const visibleH1 = h1s.filter(isVisible);
    if (h1s.length === 0) {
      add({ severity: SEV.ERROR, cat: "content", code: "H1_MISSING" });
    } else if (h1s.length > 1) {
      add({ severity: SEV.WARN, cat: "content", code: "H1_MULTI", params: { n: h1s.length }, els: h1s });
    } else {
      const t = txt(h1s[0].textContent);
      if (!t) add({ severity: SEV.ERROR, cat: "content", code: "H1_EMPTY", els: h1s });
      else add({ severity: SEV.PASS, cat: "content", code: "H1_OK", detailRaw: t.slice(0, 120), els: h1s });
    }
    if (h1s.length && !visibleH1.length) {
      add({ severity: SEV.WARN, cat: "content", code: "H1_HIDDEN", els: h1s });
    }

    const heads = Array.from(doc.querySelectorAll("h1,h2,h3,h4,h5,h6")).filter(isVisible);
    let prev = 0;
    const skips = [], emptyHeads = [];
    heads.forEach((h) => {
      const lvl = Number(h.tagName[1]);
      if (prev && lvl > prev + 1) skips.push({ el: h, from: prev, to: lvl });
      prev = lvl;
      if (!txt(h.textContent) && !h.querySelector("img")) emptyHeads.push(h);
    });
    if (skips.length) {
      add({
        severity: SEV.WARN, cat: "content", code: "H_SKIP", params: { n: skips.length },
        detailRaw: skips.slice(0, 6).map((s) => `H${s.from} → H${s.to}`).join(" · "),
        els: skips.map((s) => s.el)
      });
    }
    if (emptyHeads.length) {
      add({ severity: SEV.WARN, cat: "content", code: "H_EMPTY", params: { n: emptyHeads.length }, els: emptyHeads });
    }

    /* ---------- Images ---------- */
    const imgs = Array.from(doc.images || []);
    const noAlt = [], emptyAlt = [], longAlt = [], noDims = [], oversized = [], noLazy = [], genericName = [];
    imgs.forEach((img) => {
      const vis = isVisible(img);
      const alt = img.getAttribute("alt");
      if (alt === null) noAlt.push(img);
      else if (txt(alt) === "" && vis && img.width > 60 && img.height > 60) emptyAlt.push(img);
      else if (alt && alt.length > 125) longAlt.push(img);

      if (vis && (!img.hasAttribute("width") || !img.hasAttribute("height")) &&
          getComputedStyle(img).aspectRatio === "auto") noDims.push(img);
      if (img.naturalWidth && img.width > 0 && img.naturalWidth > img.width * 2) oversized.push(img);
      if (vis && !aboveFold(img) && img.loading !== "lazy") noLazy.push(img);

      const src = (img.getAttribute("src") || "").split("?")[0].split("/").pop() || "";
      if (/^(img|image|photo|dsc|screenshot|untitled)[\-_ ]?\d*\.(jpe?g|png|webp|gif|avif)$/i.test(src)) genericName.push(img);
    });

    if (noAlt.length) add({ severity: SEV.ERROR, cat: "images", code: "IMG_NO_ALT", params: { n: noAlt.length }, els: noAlt });
    if (emptyAlt.length) add({ severity: SEV.WARN, cat: "images", code: "IMG_EMPTY_ALT", params: { n: emptyAlt.length }, els: emptyAlt });
    if (longAlt.length) add({ severity: SEV.INFO, cat: "images", code: "IMG_LONG_ALT", params: { n: longAlt.length }, els: longAlt });
    if (noDims.length) add({ severity: SEV.WARN, cat: "perf", code: "IMG_NO_DIM", params: { n: noDims.length }, els: noDims });
    if (oversized.length) {
      add({
        severity: SEV.WARN, cat: "perf", code: "IMG_OVERSIZED", params: { n: oversized.length },
        detailRaw: oversized.slice(0, 4).map((i) => `${i.naturalWidth}px → ${Math.round(i.width)}px`).join(" · "),
        els: oversized
      });
    }
    if (noLazy.length) add({ severity: SEV.INFO, cat: "perf", code: "IMG_NO_LAZY", params: { n: noLazy.length }, els: noLazy });
    if (genericName.length) add({ severity: SEV.INFO, cat: "images", code: "IMG_GENERIC_NAME", params: { n: genericName.length }, els: genericName });

    /* ---------- Links ---------- */
    const anchors = Array.from(doc.querySelectorAll("a"));
    const emptyAnchor = [], genericAnchor = [], noHref = [], hashOnly = [], unsafeBlank = [], nofollowInternal = [];
    let internal = 0, external = 0, nofollow = 0;
    const host = location.hostname;

    anchors.forEach((a) => {
      const href = a.getAttribute("href");
      const label = txt(a.textContent) || txt(a.getAttribute("aria-label")) || txt(a.getAttribute("title"));
      const imgAlt = a.querySelector("img") ? txt(a.querySelector("img").getAttribute("alt")) : "";
      const vis = isVisible(a);
      if (href === null) { if (vis) noHref.push(a); return; }
      if (/^#$|^javascript:void/i.test(href.trim()) && vis) hashOnly.push(a);

      let abs = null;
      try { abs = new URL(href, location.href); } catch (e) { /* ignore */ }
      const rel = (a.getAttribute("rel") || "").toLowerCase();
      const httpish = abs && /^https?:$/.test(abs.protocol);
      const isExternal = httpish && abs.hostname !== host;
      if (httpish) { if (isExternal) external++; else internal++; }
      if (rel.includes("nofollow")) {
        nofollow++;
        if (httpish && !isExternal) nofollowInternal.push(a);
      }
      if (a.target === "_blank" && isExternal && !(rel.includes("noopener") || rel.includes("noreferrer"))) unsafeBlank.push(a);
      if (vis && !label && !imgAlt) emptyAnchor.push(a);
      else if (vis && label && GENERIC_ANCHORS.includes(label.toLowerCase())) genericAnchor.push(a);
    });

    if (emptyAnchor.length) add({ severity: SEV.ERROR, cat: "links", code: "A_EMPTY", params: { n: emptyAnchor.length }, els: emptyAnchor });
    if (genericAnchor.length) add({ severity: SEV.WARN, cat: "links", code: "A_GENERIC", params: { n: genericAnchor.length }, els: genericAnchor });
    if (hashOnly.length) add({ severity: SEV.INFO, cat: "links", code: "A_HASH", params: { n: hashOnly.length }, els: hashOnly });
    if (noHref.length) add({ severity: SEV.WARN, cat: "links", code: "A_NO_HREF", params: { n: noHref.length }, els: noHref });
    if (unsafeBlank.length) add({ severity: SEV.WARN, cat: "links", code: "A_UNSAFE_BLANK", params: { n: unsafeBlank.length }, els: unsafeBlank });
    if (nofollowInternal.length) add({ severity: SEV.WARN, cat: "links", code: "A_NOFOLLOW_INTERNAL", params: { n: nofollowInternal.length }, els: nofollowInternal });
    if (internal === 0 && anchors.length) {
      add({ severity: SEV.WARN, cat: "links", code: "A_NO_INTERNAL" });
    }
    add({
      severity: SEV.INFO, cat: "links", code: "A_STATS",
      params: { i: internal, e: external, nf: nofollow ? ` · ${nofollow} nofollow` : "" }
    });

    /* ---------- Canonical / robots / i18n ---------- */
    const canons = Array.from(doc.querySelectorAll('link[rel="canonical" i]'));
    if (!canons.length) {
      add({ severity: SEV.WARN, cat: "index", code: "CANON_MISSING" });
    } else if (canons.length > 1) {
      add({ severity: SEV.ERROR, cat: "index", code: "CANON_DUP", params: { n: canons.length }, els: canons });
    } else {
      const href = canons[0].getAttribute("href") || "";
      let same = false;
      try {
        const c = new URL(href, location.href);
        same = c.origin + c.pathname === location.origin + location.pathname;
      } catch (e) { /* ignore */ }
      if (!href) add({ severity: SEV.ERROR, cat: "index", code: "CANON_EMPTY", els: canons });
      else if (!same) add({ severity: SEV.WARN, cat: "index", code: "CANON_OTHER", detailRaw: href, els: canons });
      else add({ severity: SEV.PASS, cat: "index", code: "CANON_OK", detailRaw: href, els: canons });
    }

    const robots = Array.from(doc.querySelectorAll('meta[name="robots" i], meta[name="googlebot" i]'));
    const robotsContent = robots.map((m) => (m.getAttribute("content") || "").toLowerCase()).join(", ");
    if (robotsContent.includes("noindex")) {
      add({ severity: SEV.ERROR, cat: "index", code: "NOINDEX", detailRaw: robotsContent, els: robots });
    }
    if (robotsContent.includes("nofollow")) {
      add({ severity: SEV.WARN, cat: "index", code: "META_NOFOLLOW", detailRaw: robotsContent, els: robots });
    }
    if (!doc.documentElement.getAttribute("lang")) {
      add({ severity: SEV.WARN, cat: "index", code: "NO_LANG", els: [doc.documentElement] });
    }
    const hreflangs = Array.from(doc.querySelectorAll('link[rel="alternate" i][hreflang]'));
    if (hreflangs.length) {
      const selfRef = hreflangs.some((l) => {
        try { return new URL(l.getAttribute("href"), location.href).href.split("#")[0] === location.href.split("#")[0]; }
        catch (e) { return false; }
      });
      if (!selfRef) {
        add({ severity: SEV.WARN, cat: "index", code: "HREFLANG_NO_SELF", params: { n: hreflangs.length }, els: hreflangs });
      }
    }

    /* ---------- Social ---------- */
    const ogTags = Array.from(doc.querySelectorAll('meta[property^="og:" i]'));
    const og = {};
    ogTags.forEach((m) => { og[(m.getAttribute("property") || "").toLowerCase()] = txt(m.getAttribute("content")); });
    const missingOg = ["og:title", "og:description", "og:image"].filter((k) => !og[k]);
    if (missingOg.length === 3) add({ severity: SEV.WARN, cat: "social", code: "OG_MISSING" });
    else if (missingOg.length) add({ severity: SEV.WARN, cat: "social", code: "OG_PARTIAL", detailRaw: missingOg.join(" · "), els: ogTags });
    else add({ severity: SEV.PASS, cat: "social", code: "OG_OK", detailRaw: og["og:title"] || "", els: ogTags });
    if (!doc.querySelector('meta[name="twitter:card" i]')) {
      add({ severity: SEV.INFO, cat: "social", code: "TW_MISSING" });
    }

    /* ---------- Structured data ---------- */
    const ldjson = Array.from(doc.querySelectorAll('script[type="application/ld+json" i]'));
    const microdata = doc.querySelectorAll("[itemscope]").length;
    if (!ldjson.length && !microdata) {
      add({ severity: SEV.WARN, cat: "sd", code: "SD_MISSING" });
    } else {
      const broken = [], types = [];
      ldjson.forEach((s) => {
        try {
          const data = JSON.parse(s.textContent);
          [].concat(data).forEach((d) => {
            if (!d) return;
            if (d["@type"]) types.push([].concat(d["@type"]).join("/"));
            if (d["@graph"]) [].concat(d["@graph"]).forEach((g) => g && g["@type"] && types.push([].concat(g["@type"]).join("/")));
          });
        } catch (e) { broken.push(s); }
      });
      if (broken.length) add({ severity: SEV.ERROR, cat: "sd", code: "SD_INVALID", params: { n: broken.length }, els: broken });
      if (types.length) {
        add({
          severity: SEV.PASS, cat: "sd", code: "SD_OK",
          detailRaw: Array.from(new Set(types)).slice(0, 8).join(" · "), els: ldjson
        });
      }
    }

    /* ---------- Technical / performance ---------- */
    const viewport = doc.querySelector('meta[name="viewport" i]');
    if (!viewport) {
      add({ severity: SEV.ERROR, cat: "tech", code: "NO_VIEWPORT" });
    } else {
      const c = (viewport.getAttribute("content") || "").toLowerCase();
      if (c.includes("user-scalable=no") || /maximum-scale=\s*1(\.0)?\b/.test(c)) {
        add({ severity: SEV.WARN, cat: "tech", code: "VIEWPORT_NOZOOM", detailRaw: c, els: [viewport] });
      }
    }
    if (!doc.querySelector("meta[charset], meta[http-equiv='Content-Type' i]")) {
      add({ severity: SEV.WARN, cat: "tech", code: "NO_CHARSET" });
    }
    if (!doc.querySelector('link[rel~="icon" i]')) {
      add({ severity: SEV.INFO, cat: "tech", code: "NO_FAVICON" });
    }
    if (isHttps) {
      const mixed = Array.from(doc.querySelectorAll(
        'img[src^="http:"], script[src^="http:"], link[href^="http:"], iframe[src^="http:"], video[src^="http:"], source[src^="http:"]'
      ));
      if (mixed.length) add({ severity: SEV.ERROR, cat: "tech", code: "MIXED_CONTENT", params: { n: mixed.length }, els: mixed });
    } else {
      add({ severity: SEV.ERROR, cat: "tech", code: "NO_HTTPS" });
    }
    const blockingScripts = Array.from(doc.querySelectorAll("head script[src]"))
      .filter((s) => !s.async && !s.defer && s.type !== "module");
    if (blockingScripts.length) {
      add({ severity: SEV.WARN, cat: "perf", code: "BLOCKING_JS", params: { n: blockingScripts.length }, els: blockingScripts });
    }

    let words = 0;
    if (doc.body) {
      const clone = doc.body.cloneNode(true);
      clone.querySelectorAll("script,style,noscript,nav,footer,header,svg,template").forEach((n) => n.remove());
      words = txt(clone.textContent).split(/\s+/).filter((w) => w.length > 1).length;
    }
    if (words < 300) add({ severity: words < 150 ? SEV.WARN : SEV.INFO, cat: "content", code: "THIN_CONTENT", params: { n: words } });
    else add({ severity: SEV.PASS, cat: "content", code: "CONTENT_OK", params: { n: words } });

    const iframes = Array.from(doc.querySelectorAll("iframe")).filter((f) => !f.getAttribute("title") && isVisible(f));
    if (iframes.length) add({ severity: SEV.INFO, cat: "a11y", code: "IFRAME_NO_TITLE", params: { n: iframes.length }, els: iframes });

    const unlabeled = Array.from(doc.querySelectorAll("input, textarea, select")).filter((el) => {
      if (!isVisible(el)) return false;
      const t = (el.getAttribute("type") || "").toLowerCase();
      if (["hidden", "submit", "button", "image", "reset"].includes(t)) return false;
      if (el.getAttribute("aria-label") || el.getAttribute("aria-labelledby") || el.getAttribute("title")) return false;
      if (el.id && doc.querySelector(`label[for="${CSS.escape(el.id)}"]`)) return false;
      if (el.closest("label")) return false;
      return true;
    });
    if (unlabeled.length) add({ severity: SEV.WARN, cat: "a11y", code: "INPUT_NO_LABEL", params: { n: unlabeled.length }, els: unlabeled });

    const path = location.pathname;
    if (path.length > 100) add({ severity: SEV.INFO, cat: "tech", code: "URL_LONG", params: { n: path.length }, detailRaw: path });
    if (/[A-Z]/.test(path)) add({ severity: SEV.INFO, cat: "tech", code: "URL_UPPER", detailRaw: path });
    if (path.includes("_")) add({ severity: SEV.INFO, cat: "tech", code: "URL_UNDERSCORE", detailRaw: path });

    /* ---------- Scoring ---------- */
    const errors = issues.filter((i) => i.severity === SEV.ERROR).length;
    const warnings = issues.filter((i) => i.severity === SEV.WARN).length;
    const infos = issues.filter((i) => i.severity === SEV.INFO).length;
    const passes = issues.filter((i) => i.severity === SEV.PASS).length;
    const score = Math.max(0, Math.min(100, Math.round(100 - errors * 9 - warnings * 4 - infos * 1)));

    const order = { error: 0, warning: 1, info: 2, pass: 3 };
    issues.sort((a, b) => order[a.severity] - order[b.severity]);
    issues.forEach((i) => {
      i.els = (i.els || []).filter((e) => e && e.nodeType === 1);
      i.paths = i.els.slice(0, 12).map((e) => ({ path: cssPath(e), text: snippet(e) }));
      i.count = i.els.length;
      i.highlightable = i.els.some((e) => !["TITLE", "META", "LINK", "SCRIPT", "HEAD"].includes(e.tagName));
    });

    return {
      url: location.href,
      title,
      brand: siteBranding(),
      score,
      counts: { errors, warnings, infos, passes, total: issues.length },
      issues,
      generatedAt: new Date().toISOString()
    };
  }

  window.__SEO_LENS_AUDIT__ = run;
})();
