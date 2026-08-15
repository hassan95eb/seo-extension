/*  SEO Lens — SEO issues, highlighted on the page
 *  hassan mode : on
 *  https://github.com/hassan95eb/seo-extension
 */
/* SEO Lens — SEO audit engine
 * Language-agnostic: emits code + params + detailRaw only; all display strings live in i18n.js.
 */
(function () {
  if (window.__SEO_LENS_AUDIT__) return;

  // STAT is a neutral measurement, not a judgement: it is shown to the user but is
  // deliberately kept out of the issue counts and out of the score, so that a page
  // with nothing wrong can actually reach 100/100.
  const SEV = { ERROR: "error", WARN: "warning", INFO: "info", PASS: "pass", STAT: "stat" };

  const GENERIC_ANCHORS = [
    "click here", "here", "read more", "more", "link", "this", "learn more", "see more",
    "اینجا", "کلیک کنید", "اینجا کلیک کنید", "بیشتر", "ادامه مطلب", "لینک",
    "بیشتر بخوانید", "جزئیات", "مشاهده"
  ];

  const txt = (s) => (s || "").replace(/\s+/g, " ").trim();

  /* ---------- bidi / RTL helpers ---------- */

  // Arabic, Hebrew, Syriac, Thaana, plus the Arabic presentation blocks.
  const RTL_CHARS = /[֐-׿؀-ۿ܀-ݏݐ-ݿހ-޿ࢠ-ࣿיִ-﷿ﹰ-﻿]/;
  // A run of Latin letters or digits long enough to be reordered visibly inside RTL text.
  const LTR_RUN = /[A-Za-z][A-Za-z0-9._-]+|\d{2,}/;
  const RTL_LANGS = ["ar", "fa", "he", "iw", "ur", "ps", "sd", "ug", "yi", "dv", "ku", "ckb"];
  const ZWNJ = /‌/g;

  const hasRtl = (s) => RTL_CHARS.test(s || "");
  const langIsRtl = (code) => {
    const base = String(code || "").toLowerCase().split(/[-_]/)[0];
    return base ? RTL_LANGS.indexOf(base) !== -1 : false;
  };

  // Character count as a human would count it: ZWNJ is a joining control, not a letter,
  // and counting it inflates a typical Persian title by 1–3 characters.
  const charLen = (s) => (s || "").replace(ZWNJ, "").length;

  // Google truncates SERP titles and descriptions by rendered pixel width, not by
  // character count. Character count is a proxy, and it is roughly 1.6x noisier in
  // Persian than in English because cursive joining changes glyph width dramatically.
  let _ctx = null;
  function measurePx(str, font) {
    if (!str) return 0;
    try {
      if (_ctx === null) _ctx = document.createElement("canvas").getContext("2d") || false;
      if (!_ctx) return 0;
      _ctx.font = font;
      return Math.round(_ctx.measureText(str.replace(ZWNJ, "")).width);
    } catch (e) { return 0; }
  }
  // Google renders desktop SERP titles at ~20px and snippets at ~13px in a system sans.
  // The font stack keeps Persian and Arabic text out of a Latin-only fallback face.
  const TITLE_FONT = '20px Arial, "Segoe UI", Tahoma, Vazirmatn, sans-serif';
  const DESC_FONT = '13px Arial, "Segoe UI", Tahoma, Vazirmatn, sans-serif';
  const TITLE_PX_MAX = 580;
  const DESC_PX_MAX = 920;

  // Latin/digit runs embedded in RTL text reorder unless the run is isolated. An element
  // counts as handled if it, or something inside it, uses bdi, dir, bdo or unicode-bidi.
  function bidiIsolated(el) {
    if (!el) return false;
    if (el.hasAttribute("dir")) return true;
    if (el.querySelector("bdi, bdo, [dir]")) return true;
    try {
      if (/isolate|plaintext/.test(getComputedStyle(el).unicodeBidi || "")) return true;
    } catch (e) { /* ignore */ }
    return false;
  }

  // Persian and Arabic-Indic digits normalised to ASCII, so "۱۲۹۹" and "1299" compare equal.
  function normalizeDigits(s) {
    return String(s == null ? "" : s)
      .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
      .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660));
  }

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
      // Pixels decide, characters inform. A 70-character Persian title that fits inside
      // 580px is not truncated, and a 55-character English title in wide glyphs can be.
      const L = charLen(title);
      const px = measurePx(title, TITLE_FONT);
      const p = { n: L, px, max: TITLE_PX_MAX };
      // px === 0 means canvas is unavailable (blocked 2d context); fall back to characters.
      if (px > TITLE_PX_MAX || (!px && L > 60)) {
        add({ severity: SEV.WARN, cat: "core", code: px ? "TITLE_PX_LONG" : "TITLE_LONG", params: p, detailRaw: title, els: titles });
      } else if (L < 30) {
        add({ severity: SEV.WARN, cat: "core", code: "TITLE_SHORT", params: p, detailRaw: title, els: titles });
      } else {
        add({ severity: SEV.PASS, cat: "core", code: "TITLE_OK", params: p, detailRaw: title, els: titles });
      }
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
      const L = charLen(desc);
      const px = measurePx(desc, DESC_FONT);
      const p = { n: L, px, max: DESC_PX_MAX };
      if (px > DESC_PX_MAX || (!px && L > 160)) {
        add({ severity: SEV.WARN, cat: "core", code: px ? "DESC_PX_LONG" : "DESC_LONG", params: p, detailRaw: desc, els: descs });
      } else if (L < 70) {
        add({ severity: SEV.WARN, cat: "core", code: "DESC_SHORT", params: p, detailRaw: desc, els: descs });
      } else {
        add({ severity: SEV.PASS, cat: "core", code: "DESC_OK", params: p, detailRaw: desc, els: descs });
      }
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
    // Two separate codes instead of one code with a pre-built suffix, so that the
    // engine hands i18n.js plain numbers and never assembles display text itself.
    add({
      severity: SEV.STAT, cat: "links",
      code: nofollow ? "A_STATS_NF" : "A_STATS",
      params: { i: internal, e: external, nf: nofollow }
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
    const htmlLang = doc.documentElement.getAttribute("lang");
    if (!htmlLang) {
      add({ severity: SEV.WARN, cat: "index", code: "NO_LANG", els: [doc.documentElement] });
    }

    /* ---------- Text direction ----------
     * Missing or contradictory `dir` is one of the most common real defects on Persian,
     * Arabic, Hebrew and Urdu pages, and no competing extension reads the attribute at all.
     * Only reported when the page actually is RTL, either by declared language or by
     * the script its own text is written in — `dir` is genuinely optional on LTR pages.
     */
    const htmlDir = (doc.documentElement.getAttribute("dir") || "").toLowerCase();
    const bodyDir = doc.body ? (doc.body.getAttribute("dir") || "").toLowerCase() : "";
    const sampleText = doc.body ? txt(doc.body.innerText || doc.body.textContent).slice(0, 4000) : "";
    const rtlChars = (sampleText.match(new RegExp(RTL_CHARS.source, "g")) || []).length;
    const contentIsRtl = rtlChars > 40 || (sampleText.length > 0 && rtlChars / sampleText.length > 0.2);
    const pageIsRtl = langIsRtl(htmlLang) || contentIsRtl;

    if (langIsRtl(htmlLang) && htmlDir === "ltr") {
      add({
        severity: SEV.ERROR, cat: "index", code: "DIR_CONFLICT",
        params: { lang: htmlLang }, detailRaw: `lang="${htmlLang}" dir="ltr"`, els: [doc.documentElement]
      });
    } else if (pageIsRtl && !htmlDir && bodyDir === "rtl") {
      add({ severity: SEV.WARN, cat: "index", code: "DIR_ON_BODY", els: [doc.documentElement] });
    } else if (pageIsRtl && !htmlDir) {
      add({ severity: SEV.WARN, cat: "index", code: "DIR_MISSING", els: [doc.documentElement] });
    } else if (pageIsRtl && htmlDir === "rtl") {
      add({ severity: SEV.PASS, cat: "index", code: "DIR_OK", detailRaw: `dir="rtl"`, els: [doc.documentElement] });
    } else if (!pageIsRtl && htmlDir === "rtl") {
      add({ severity: SEV.WARN, cat: "index", code: "DIR_RTL_LTR_CONTENT", els: [doc.documentElement] });
    }

    // Latin brand names, version numbers and prices inside RTL text reorder on render
    // unless the run is isolated. Headings and link labels are where it is most visible,
    // and both are elements we can outline on the page.
    if (pageIsRtl) {
      const mixed = Array.from(doc.querySelectorAll("h1,h2,h3,h4,h5,h6,a,li,button,figcaption"))
        .filter((el) => {
          if (!isVisible(el)) return false;
          if (el.querySelector("h1,h2,h3,h4,h5,h6,a,li,button,figcaption")) return false;
          const s = txt(el.textContent);
          if (!s || s.length > 300) return false;
          return hasRtl(s) && LTR_RUN.test(s) && !bidiIsolated(el);
        });
      if (mixed.length) {
        add({
          severity: SEV.INFO, cat: "content", code: "BIDI_UNISOLATED",
          params: { n: mixed.length },
          detailRaw: mixed.slice(0, 3).map((e) => txt(e.textContent).slice(0, 60)).join(" · "),
          els: mixed
        });
      }
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
      const broken = [], types = [], nodes = [];
      // Every node in the graph, kept with the script it came from so a dead type can be
      // outlined rather than merely listed.
      const walk = (d, el, depth) => {
        if (!d || typeof d !== "object" || depth > 6) return;
        if (Array.isArray(d)) { d.forEach((x) => walk(x, el, depth + 1)); return; }
        if (d["@type"]) {
          nodes.push({ node: d, el });
          [].concat(d["@type"]).forEach((tp) => { if (typeof tp === "string") types.push(tp); });
        }
        if (d["@graph"]) walk(d["@graph"], el, depth + 1);
        ["mainEntity", "itemListElement", "hasPart", "about", "subjectOf"].forEach((k) => {
          if (d[k]) walk(d[k], el, depth + 1);
        });
      };
      ldjson.forEach((s) => {
        try { walk(JSON.parse(s.textContent), s, 0); }
        catch (e) { broken.push(s); }
      });
      if (broken.length) add({ severity: SEV.ERROR, cat: "sd", code: "SD_INVALID", params: { n: broken.length }, els: broken });
      if (types.length) {
        add({
          severity: SEV.PASS, cat: "sd", code: "SD_OK",
          detailRaw: Array.from(new Set(types)).slice(0, 8).join(" · "), els: ldjson
        });
      }

      /* --- Retired rich results ---
       * Validators check schema.org conformance, not Google feature eligibility, so a
       * retired type validates cleanly for ever while producing no SERP feature at all.
       * Dates are ISO and language-neutral; i18n.js formats them per locale.
       */
      const RETIRED = {          // no rich result of any kind any more
        FAQPage: "2026-05-07",
        HowTo: "2023-08-08",
        SpecialAnnouncement: "2025-09-01",
        Occupation: "2025-09-01",
        Vehicle: "2025-09-01",
        Quiz: "2026-01-01"
      };
      const DEPRECATED = {       // type still meaningful, its rich result is gone
        Course: "2025-09-01",
        ClaimReview: "2025-06-01",
        LearningResource: "2025-09-01"
      };
      const typeEls = {};
      nodes.forEach((n) => {
        [].concat(n.node["@type"]).forEach((tp) => {
          if (typeof tp !== "string") return;
          (typeEls[tp] = typeEls[tp] || []).push(n.el);
        });
      });
      Object.keys(RETIRED).forEach((tp) => {
        if (typeEls[tp]) {
          add({
            severity: SEV.WARN, cat: "sd", code: "SD_RETIRED",
            params: { type: tp, date: RETIRED[tp] }, els: Array.from(new Set(typeEls[tp]))
          });
        }
      });
      Object.keys(DEPRECATED).forEach((tp) => {
        if (typeEls[tp]) {
          add({
            severity: SEV.INFO, cat: "sd", code: "SD_DEPRECATED",
            params: { type: tp, date: DEPRECATED[tp] }, els: Array.from(new Set(typeEls[tp]))
          });
        }
      });
      // Sitelinks searchbox: the dead part is the SearchAction, not the WebSite type.
      const searchbox = nodes.filter((n) => {
        const t = [].concat(n.node["@type"]).join("/");
        if (!/WebSite/.test(t)) return false;
        return [].concat(n.node.potentialAction || []).some(
          (a) => a && /SearchAction/.test([].concat(a["@type"] || "").join("/"))
        );
      });
      if (searchbox.length) {
        add({
          severity: SEV.INFO, cat: "sd", code: "SD_SEARCHBOX",
          params: { date: "2024-11-21" }, els: Array.from(new Set(searchbox.map((n) => n.el)))
        });
      }

      /* --- Markup that contradicts the visible page ---
       * Google's structured-data policy forbids marking up content that is not visible,
       * and price/rating mismatches are what draw manual actions. Only numeric values are
       * tested, and Persian and Arabic-Indic digits are normalised first, so a page that
       * prints ۱٬۲۹۹٬۰۰۰ against "1299000" in JSON-LD is not falsely accused.
       */
      const bodyText = doc.body ? normalizeDigits(doc.body.innerText || doc.body.textContent || "").replace(/[\s,٬،]/g, "") : "";
      const invisible = [];
      if (bodyText) {
        const checkNum = (val, el, key) => {
          if (val == null) return;
          const raw = normalizeDigits(val).replace(/[\s,٬،]/g, "");
          if (!/^\d+(\.\d+)?$/.test(raw)) return;
          const trimmed = raw.replace(/\.0+$/, "").replace(/(\.\d*[1-9])0+$/, "$1");
          if (bodyText.indexOf(raw) === -1 && bodyText.indexOf(trimmed) === -1) {
            invisible.push({ el, txt: `${key}: ${raw}` });
          }
        };
        nodes.forEach((n) => {
          [].concat(n.node.offers || []).forEach((o) => { if (o) checkNum(o.price, n.el, "price"); });
          const ar = n.node.aggregateRating;
          if (ar) checkNum(ar.ratingValue, n.el, "ratingValue");
        });
      }
      if (invisible.length) {
        add({
          severity: SEV.WARN, cat: "sd", code: "SD_INVISIBLE",
          params: { n: invisible.length },
          detailRaw: invisible.slice(0, 4).map((x) => x.txt).join(" · "),
          els: Array.from(new Set(invisible.map((x) => x.el)))
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

    return finalize({
      url: location.href,
      title,
      brand: siteBranding(),
      issues,
      generatedAt: new Date().toISOString()
    });
  }

  /* ---------- Scoring ----------
   * Split out of run() because the header pass (below) adds findings after the first
   * paint and the score, counts and ordering all have to be recomputed from scratch.
   */
  function finalize(report) {
    const issues = report.issues;
    const errors = issues.filter((i) => i.severity === SEV.ERROR).length;
    const warnings = issues.filter((i) => i.severity === SEV.WARN).length;
    const infos = issues.filter((i) => i.severity === SEV.INFO).length;
    const passes = issues.filter((i) => i.severity === SEV.PASS).length;
    const stats = issues.filter((i) => i.severity === SEV.STAT).length;
    // STAT items are measurements, not findings, so they cost nothing.
    report.score = Math.max(0, Math.min(100, Math.round(100 - errors * 9 - warnings * 4 - infos * 1)));

    const order = { error: 0, warning: 1, info: 2, stat: 3, pass: 4 };
    issues.sort((a, b) => order[a.severity] - order[b.severity]);
    issues.forEach((i) => {
      i.els = (i.els || []).filter((e) => e && e.nodeType === 1);
      i.paths = i.els.slice(0, 12).map((e) => ({ path: cssPath(e), text: snippet(e) }));
      i.count = i.els.length;
      i.highlightable = i.els.some((e) => !["TITLE", "META", "LINK", "SCRIPT", "HEAD"].includes(e.tagName));
    });
    report.counts = { errors, warnings, infos, passes, stats, total: issues.length };
    return report;
  }

  /* ---------- HTTP header pass ----------
   * `noindex` delivered as an X-Robots-Tag header never appears in the DOM, so every
   * DOM-only auditor reports the page as perfectly fine while it is deindexed. One
   * same-origin request gets it. HEAD first because it costs no body; a GET fallback
   * covers servers that reject HEAD.
   *
   * Runs after run() rather than inside it: the panel paints immediately from the
   * synchronous audit and these findings are merged in when the response lands.
   */
  const ROBOTS_UAS = ["googlebot", "googlebot-news", "google", "otherbot"];

  function parseXRobots(value) {
    const out = { noindex: false, nofollow: false, nosnippet: false, maxSnippet: null, unavailable: null, raw: value };
    String(value || "").split(",").forEach((part) => {
      let rule = part.trim();
      if (!rule) return;
      // A rule may be scoped to a user agent: `googlebot: noindex`.
      const m = rule.match(/^([a-z0-9\-_]+)\s*:\s*(.+)$/i);
      let directive = rule;
      if (m && !/^(max-snippet|max-image-preview|max-video-preview|unavailable_after)$/i.test(m[1])) {
        if (ROBOTS_UAS.indexOf(m[1].toLowerCase()) === -1) return; // scoped to a bot we do not report on
        directive = m[2].trim();
      }
      const d = directive.toLowerCase();
      if (d === "noindex" || d === "none") out.noindex = true;
      if (d === "nofollow" || d === "none") out.nofollow = true;
      if (d === "nosnippet") out.nosnippet = true;
      const ms = directive.match(/^max-snippet\s*:\s*(-?\d+)$/i);
      if (ms) out.maxSnippet = Number(ms[1]);
      const ua = directive.match(/^unavailable_after\s*:\s*(.+)$/i);
      if (ua) out.unavailable = ua[1].trim();
    });
    return out;
  }

  async function fetchHeaders(url) {
    const opts = { credentials: "include", redirect: "follow", cache: "no-store" };
    try {
      const head = await fetch(url, Object.assign({ method: "HEAD" }, opts));
      if (head.ok || head.status === 304) return head;
    } catch (e) { /* fall through to GET */ }
    return fetch(url, Object.assign({ method: "GET" }, opts));
  }

  async function auditHeaders(report) {
    if (!/^https?:$/.test(location.protocol)) return report;
    let res;
    try { res = await fetchHeaders(location.href); }
    catch (e) { return report; }
    if (!res || !res.headers) return report;

    const issues = report.issues;
    let idc = issues.length;
    const add = (o) => issues.push(Object.assign(
      { id: "h" + ++idc, els: [], params: {}, detailRaw: "" }, o
    ));

    const xr = res.headers.get("x-robots-tag");
    if (xr) {
      const r = parseXRobots(xr);
      if (r.noindex) add({ severity: SEV.ERROR, cat: "index", code: "HDR_NOINDEX", detailRaw: xr });
      if (r.nofollow) add({ severity: SEV.WARN, cat: "index", code: "HDR_NOFOLLOW", detailRaw: xr });
      if (r.nosnippet || r.maxSnippet === 0) {
        add({ severity: SEV.WARN, cat: "index", code: "HDR_NOSNIPPET", detailRaw: xr });
      }
      if (r.unavailable) {
        const when = Date.parse(r.unavailable);
        if (!isNaN(when) && when < Date.now()) {
          add({ severity: SEV.ERROR, cat: "index", code: "HDR_EXPIRED", detailRaw: r.unavailable });
        }
      }
      if (!r.noindex && !r.nofollow && !r.nosnippet && r.maxSnippet !== 0) {
        add({ severity: SEV.PASS, cat: "index", code: "HDR_ROBOTS_OK", detailRaw: xr });
      }
    }

    // A canonical delivered as a Link header outranks nothing — it competes with the one
    // in <head>, and when the two disagree Google ignores both.
    const link = res.headers.get("link");
    if (link) {
      const m = link.match(/<([^>]+)>\s*;[^,]*rel\s*=\s*"?canonical"?/i);
      if (m) {
        const headCanon = document.querySelector('link[rel="canonical" i]');
        let hdrUrl = "", headUrl = "";
        try { hdrUrl = new URL(m[1].trim(), location.href).href; } catch (e) { hdrUrl = m[1].trim(); }
        if (headCanon) {
          try { headUrl = new URL(headCanon.getAttribute("href") || "", location.href).href; } catch (e) { /* ignore */ }
        }
        if (headUrl && hdrUrl && headUrl !== hdrUrl) {
          add({
            severity: SEV.WARN, cat: "index", code: "HDR_CANON_CONFLICT",
            detailRaw: hdrUrl, els: headCanon ? [headCanon] : []
          });
        } else if (!headCanon) {
          add({ severity: SEV.INFO, cat: "index", code: "HDR_CANON_ONLY", detailRaw: hdrUrl });
        }
      }
    }

    return finalize(report);
  }

  window.__SEO_LENS_AUDIT__ = run;
  window.__SEO_LENS_AUDIT_HEADERS__ = auditHeaders;
})();
