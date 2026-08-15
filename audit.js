/*  SEO Lens — SEO issues, highlighted on the page
 *  hassan mode : on
 *  https://github.com/hassan95eb/seo-extension
 */
/* SEO Lens — SEO audit engine
 * Returns a list of issues, each carrying direct references to the offending elements
 * so the panel can outline them on the page.
 * severity: error | warning | info | pass
 */
(function () {
  if (window.__SEO_LENS_AUDIT__) return;

  const SEV = { ERROR: "error", WARN: "warning", INFO: "info", PASS: "pass" };

  const GENERIC_ANCHORS = [
    "click here", "here", "read more", "more", "link", "this", "learn more",
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
    let node = el;
    let depth = 0;
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
    if (el.tagName === "IMG") return el.getAttribute("src") ? el.getAttribute("src").split("/").pop().slice(0, max) : "<img>";
    const t = txt(el.textContent);
    if (t) return t.length > max ? t.slice(0, max) + "…" : t;
    return "<" + el.tagName.toLowerCase() + ">";
  }

  function inViewportHead(el) {
    // Is the element above the fold?
    try {
      const top = el.getBoundingClientRect().top + window.scrollY;
      return top < window.innerHeight * 1.2;
    } catch (e) {
      return false;
    }
  }

  function run() {
    const issues = [];
    let idc = 0;
    const add = (o) => {
      issues.push(Object.assign({ id: "i" + ++idc, els: [] }, o));
    };

    const doc = document;
    const pageUrl = location.href;
    const isHttps = location.protocol === "https:";

    /* ---------------- 1. Title ---------------- */
    const titles = Array.from(doc.querySelectorAll("head title"));
    const title = txt(doc.title);
    if (!titles.length || !title) {
      add({
        severity: SEV.ERROR, category: "تگ‌های اصلی", code: "TITLE_MISSING",
        title: "تگ Title وجود ندارد",
        detail: "صفحه هیچ عنوانی ندارد؛ گوگل مجبور می‌شود عنوان را خودش بسازد.",
        fix: "<title>عنوان ۵۰ تا ۶۰ کاراکتری با کلمه کلیدی اصلی</title> را در <head> اضافه کن."
      });
    } else {
      if (titles.length > 1) {
        add({
          severity: SEV.ERROR, category: "تگ‌های اصلی", code: "TITLE_DUP",
          title: `${titles.length} تگ Title در صفحه هست`,
          detail: "فقط اولین تگ خوانده می‌شود و بقیه باعث سردرگمی خزنده می‌شوند.",
          fix: "تگ‌های اضافی Title را حذف کن.",
          els: titles.slice(1)
        });
      }
      const L = title.length;
      if (L < 30) {
        add({
          severity: SEV.WARN, category: "تگ‌های اصلی", code: "TITLE_SHORT",
          title: `Title خیلی کوتاه است (${L} کاراکتر)`,
          detail: `«${title}»`,
          fix: "بین ۳۰ تا ۶۰ کاراکتر بنویس تا فضای SERP هدر نرود.",
          els: titles
        });
      } else if (L > 60) {
        add({
          severity: SEV.WARN, category: "تگ‌های اصلی", code: "TITLE_LONG",
          title: `Title خیلی بلند است (${L} کاراکتر)`,
          detail: `«${title}» — احتمالاً در نتایج جستجو بریده می‌شود.`,
          fix: "به زیر ۶۰ کاراکتر کوتاهش کن.",
          els: titles
        });
      } else {
        add({
          severity: SEV.PASS, category: "تگ‌های اصلی", code: "TITLE_OK",
          title: `Title مناسب است (${L} کاراکتر)`, detail: `«${title}»`, els: titles
        });
      }
    }

    /* ---------------- 2. Meta description ---------------- */
    const descs = Array.from(doc.querySelectorAll('meta[name="description" i]'));
    const desc = descs.length ? txt(descs[0].getAttribute("content")) : "";
    if (!descs.length || !desc) {
      add({
        severity: SEV.ERROR, category: "تگ‌های اصلی", code: "DESC_MISSING",
        title: "Meta Description وجود ندارد",
        detail: "توضیح متا روی نرخ کلیک (CTR) اثر مستقیم دارد.",
        fix: '<meta name="description" content="۱۲۰ تا ۱۵۵ کاراکتر توضیح جذاب"> را اضافه کن.',
        els: descs
      });
    } else {
      if (descs.length > 1) {
        add({
          severity: SEV.WARN, category: "تگ‌های اصلی", code: "DESC_DUP",
          title: `${descs.length} تگ Meta Description تکراری`,
          detail: "فقط یکی باید وجود داشته باشد.", fix: "بقیه را حذف کن.", els: descs.slice(1)
        });
      }
      const L = desc.length;
      if (L < 70) {
        add({
          severity: SEV.WARN, category: "تگ‌های اصلی", code: "DESC_SHORT",
          title: `Meta Description کوتاه است (${L} کاراکتر)`,
          detail: `«${desc}»`, fix: "به ۱۲۰ تا ۱۵۵ کاراکتر برسان.", els: descs
        });
      } else if (L > 160) {
        add({
          severity: SEV.WARN, category: "تگ‌های اصلی", code: "DESC_LONG",
          title: `Meta Description بلند است (${L} کاراکتر)`,
          detail: "در نتایج جستجو با «…» بریده می‌شود.", fix: "به زیر ۱۶۰ کاراکتر کوتاهش کن.", els: descs
        });
      } else {
        add({
          severity: SEV.PASS, category: "تگ‌های اصلی", code: "DESC_OK",
          title: `Meta Description مناسب است (${L} کاراکتر)`, detail: `«${desc}»`, els: descs
        });
      }
    }

    /* ---------------- 3. Headings ---------------- */
    const h1s = Array.from(doc.querySelectorAll("h1"));
    const visibleH1 = h1s.filter(isVisible);
    if (h1s.length === 0) {
      add({
        severity: SEV.ERROR, category: "ساختار محتوا", code: "H1_MISSING",
        title: "صفحه هیچ H1 ندارد",
        detail: "H1 مهم‌ترین سیگنال موضوع صفحه است.",
        fix: "یک H1 یکتا و شامل کلمه کلیدی اصلی اضافه کن."
      });
    } else if (h1s.length > 1) {
      add({
        severity: SEV.WARN, category: "ساختار محتوا", code: "H1_MULTI",
        title: `${h1s.length} تگ H1 در صفحه هست`,
        detail: "بهتر است هر صفحه فقط یک H1 داشته باشد.",
        fix: "بقیه را به H2 تبدیل کن.", els: h1s
      });
    } else {
      const t = txt(h1s[0].textContent);
      if (!t) {
        add({
          severity: SEV.ERROR, category: "ساختار محتوا", code: "H1_EMPTY",
          title: "H1 خالی است", detail: "تگ H1 هیچ متنی ندارد.",
          fix: "داخل H1 متن معنادار بگذار (اگر لوگوست، از alt استفاده کن).", els: h1s
        });
      } else {
        add({
          severity: SEV.PASS, category: "ساختار محتوا", code: "H1_OK",
          title: "یک H1 یکتا دارد", detail: `«${t.slice(0, 100)}»`, els: h1s
        });
      }
      if (h1s.length && !visibleH1.length) {
        add({
          severity: SEV.WARN, category: "ساختار محتوا", code: "H1_HIDDEN",
          title: "H1 برای کاربر نمایش داده نمی‌شود",
          detail: "H1 مخفی (display:none یا visibility:hidden) است.",
          fix: "H1 قابل مشاهده بگذار؛ متن مخفی ریسک اسپم دارد.", els: h1s
        });
      }
    }

    // heading level skips
    const heads = Array.from(doc.querySelectorAll("h1,h2,h3,h4,h5,h6")).filter(isVisible);
    let prev = 0;
    const skips = [];
    const emptyHeads = [];
    heads.forEach((h) => {
      const lvl = Number(h.tagName[1]);
      if (prev && lvl > prev + 1) skips.push({ el: h, from: prev, to: lvl });
      prev = lvl;
      if (!txt(h.textContent) && !h.querySelector("img")) emptyHeads.push(h);
    });
    if (skips.length) {
      add({
        severity: SEV.WARN, category: "ساختار محتوا", code: "H_SKIP",
        title: `${skips.length} پرش در ترتیب هدینگ‌ها`,
        detail: skips.slice(0, 5).map((s) => `H${s.from} → H${s.to}`).join("، "),
        fix: "ترتیب هدینگ‌ها را پلکانی کن (H2 بعد H1، H3 بعد H2).",
        els: skips.map((s) => s.el)
      });
    }
    if (emptyHeads.length) {
      add({
        severity: SEV.WARN, category: "ساختار محتوا", code: "H_EMPTY",
        title: `${emptyHeads.length} هدینگ خالی`,
        detail: "تگ هدینگ بدون متن، ساختار صفحه را به هم می‌ریزد.",
        fix: "یا متن بگذار یا تگ را به div تبدیل کن.", els: emptyHeads
      });
    }

    /* ---------------- 4. Images ---------------- */
    const imgs = Array.from(doc.images || []);
    const noAlt = [];
    const emptyAlt = [];
    const longAlt = [];
    const noDims = [];
    const oversized = [];
    const noLazy = [];
    const genericName = [];

    imgs.forEach((img) => {
      const vis = isVisible(img);
      const alt = img.getAttribute("alt");
      if (alt === null) noAlt.push(img);
      else if (txt(alt) === "" && vis && img.width > 60 && img.height > 60) emptyAlt.push(img);
      else if (alt && alt.length > 125) longAlt.push(img);

      if (vis && (!img.hasAttribute("width") || !img.hasAttribute("height")) &&
          getComputedStyle(img).aspectRatio === "auto") noDims.push(img);

      if (img.naturalWidth && img.width && img.naturalWidth > img.width * 2 && img.width > 0) oversized.push(img);
      if (vis && !inViewportHead(img) && img.loading !== "lazy") noLazy.push(img);

      const src = (img.getAttribute("src") || "").split("?")[0].split("/").pop() || "";
      if (/^(img|image|photo|dsc|screenshot|untitled)[\-_ ]?\d*\.(jpe?g|png|webp|gif|avif)$/i.test(src)) genericName.push(img);
    });

    if (noAlt.length) {
      add({
        severity: SEV.ERROR, category: "تصاویر", code: "IMG_NO_ALT",
        title: `${noAlt.length} تصویر بدون attribute alt`,
        detail: "تصاویر بدون alt نه در جستجوی تصویر دیده می‌شوند نه برای اسکرین‌ریدر قابل فهم‌اند.",
        fix: 'برای هر تصویر alt توصیفی بنویس؛ اگر تزئینی است alt="" بگذار.',
        els: noAlt
      });
    }
    if (emptyAlt.length) {
      add({
        severity: SEV.WARN, category: "تصاویر", code: "IMG_EMPTY_ALT",
        title: `${emptyAlt.length} تصویر بزرگ با alt خالی`,
        detail: 'alt="" یعنی تصویر تزئینی؛ برای تصاویر محتوایی درست نیست.',
        fix: "اگر تصویر معنادار است، متن alt بنویس.", els: emptyAlt
      });
    }
    if (longAlt.length) {
      add({
        severity: SEV.INFO, category: "تصاویر", code: "IMG_LONG_ALT",
        title: `${longAlt.length} تصویر با alt خیلی بلند`,
        detail: "alt بیش از ۱۲۵ کاراکتر توسط اسکرین‌ریدرها بریده می‌شود.",
        fix: "alt را کوتاه و توصیفی کن.", els: longAlt
      });
    }
    if (noDims.length) {
      add({
        severity: SEV.WARN, category: "پرفورمنس", code: "IMG_NO_DIM",
        title: `${noDims.length} تصویر بدون width/height`,
        detail: "نبود ابعاد باعث پرش لایوت (CLS) و افت Core Web Vitals می‌شود.",
        fix: "روی تگ img مقدار width و height بگذار یا aspect-ratio تعریف کن.", els: noDims
      });
    }
    if (oversized.length) {
      add({
        severity: SEV.WARN, category: "پرفورمنس", code: "IMG_OVERSIZED",
        title: `${oversized.length} تصویر بزرگ‌تر از نیاز بارگذاری شده`,
        detail: oversized.slice(0, 4).map((i) => `${i.naturalWidth}px → نمایش ${Math.round(i.width)}px`).join("، "),
        fix: "تصویر را در اندازه واقعی نمایش سرو کن یا از srcset استفاده کن.", els: oversized
      });
    }
    if (noLazy.length) {
      add({
        severity: SEV.INFO, category: "پرفورمنس", code: "IMG_NO_LAZY",
        title: `${noLazy.length} تصویر پایین صفحه بدون lazy-load`,
        detail: "این تصاویر همان اول بارگذاری می‌شوند و LCP را کند می‌کنند.",
        fix: 'loading="lazy" اضافه کن (به تصاویر بالای صفحه نزن).', els: noLazy
      });
    }
    if (genericName.length) {
      add({
        severity: SEV.INFO, category: "تصاویر", code: "IMG_GENERIC_NAME",
        title: `${genericName.length} تصویر با نام فایل بی‌معنی`,
        detail: "مثل IMG_1234.jpg — سیگنال سئوی تصویر را از دست می‌دهی.",
        fix: "نام فایل را توصیفی و با خط تیره بنویس.", els: genericName
      });
    }

    /* ---------------- 5. Links ---------------- */
    const anchors = Array.from(doc.querySelectorAll("a"));
    const emptyAnchor = [];
    const genericAnchor = [];
    const noHref = [];
    const hashOnly = [];
    const unsafeBlank = [];
    const nofollowInternal = [];
    let internal = 0, external = 0, nofollow = 0;
    const host = location.hostname;

    anchors.forEach((a) => {
      const href = a.getAttribute("href");
      const label = txt(a.textContent) || txt(a.getAttribute("aria-label")) || txt(a.getAttribute("title"));
      const imgAlt = a.querySelector("img") ? txt(a.querySelector("img").getAttribute("alt")) : "";
      const vis = isVisible(a);

      if (href === null) {
        if (vis) noHref.push(a);
        return;
      }
      if (/^#$|^javascript:void/i.test(href.trim())) { if (vis) hashOnly.push(a); }

      let abs = null;
      try { abs = new URL(href, location.href); } catch (e) { /* ignore */ }
      const rel = (a.getAttribute("rel") || "").toLowerCase();
      const httpish = abs && /^https?:$/.test(abs.protocol);
      const isExternal = httpish && abs.hostname !== host;
      if (httpish) {
        if (isExternal) external++; else internal++;
      }
      if (rel.includes("nofollow")) {
        nofollow++;
        if (httpish && !isExternal) nofollowInternal.push(a);
      }
      if (a.target === "_blank" && isExternal && !(rel.includes("noopener") || rel.includes("noreferrer"))) {
        unsafeBlank.push(a);
      }
      if (vis && !label && !imgAlt) emptyAnchor.push(a);
      else if (vis && label && GENERIC_ANCHORS.includes(label.toLowerCase())) genericAnchor.push(a);
    });

    if (emptyAnchor.length) {
      add({
        severity: SEV.ERROR, category: "لینک‌ها", code: "A_EMPTY",
        title: `${emptyAnchor.length} لینک بدون متن قابل خواندن`,
        detail: "گوگل و اسکرین‌ریدر نمی‌فهمند این لینک به کجا می‌رود.",
        fix: "متن لینک بگذار یا aria-label اضافه کن.", els: emptyAnchor
      });
    }
    if (genericAnchor.length) {
      add({
        severity: SEV.WARN, category: "لینک‌ها", code: "A_GENERIC",
        title: `${genericAnchor.length} لینک با انکر تکست کلیشه‌ای`,
        detail: "مثل «اینجا کلیک کنید» یا «بیشتر» — هیچ سیگنال موضوعی منتقل نمی‌کند.",
        fix: "انکر تکست توصیفی بنویس؛ مثلاً «راهنمای قیمت‌گذاری».", els: genericAnchor
      });
    }
    if (hashOnly.length) {
      add({
        severity: SEV.INFO, category: "لینک‌ها", code: "A_HASH",
        title: `${hashOnly.length} لینک با href="#" یا javascript:`,
        detail: "این‌ها لینک واقعی نیستند و خزنده دنبالشان نمی‌رود.",
        fix: "اگر دکمه است از <button> استفاده کن.", els: hashOnly
      });
    }
    if (noHref.length) {
      add({
        severity: SEV.WARN, category: "لینک‌ها", code: "A_NO_HREF",
        title: `${noHref.length} تگ <a> بدون href`,
        detail: "بدون href، تگ a اصلاً لینک محسوب نمی‌شود.",
        fix: "href بگذار یا تگ را عوض کن.", els: noHref
      });
    }
    if (unsafeBlank.length) {
      add({
        severity: SEV.WARN, category: "لینک‌ها", code: "A_UNSAFE_BLANK",
        title: `${unsafeBlank.length} لینک target="_blank" بدون rel="noopener"`,
        detail: "ریسک امنیتی tabnabbing و افت پرفورمنس.",
        fix: 'rel="noopener noreferrer" اضافه کن.', els: unsafeBlank
      });
    }
    if (nofollowInternal.length) {
      add({
        severity: SEV.WARN, category: "لینک‌ها", code: "A_NOFOLLOW_INTERNAL",
        title: `${nofollowInternal.length} لینک داخلی nofollow شده`,
        detail: "nofollow روی لینک داخلی، جریان اعتبار سایت را قطع می‌کند.",
        fix: "nofollow را از لینک‌های داخلی بردار.", els: nofollowInternal
      });
    }
    add({
      severity: SEV.INFO, category: "لینک‌ها", code: "A_STATS",
      title: `${internal} لینک داخلی، ${external} لینک خارجی${nofollow ? `، ${nofollow} nofollow` : ""}`,
      detail: internal === 0 ? "هیچ لینک داخلی وجود ندارد — لینک‌سازی داخلی برای خزش مهم است." : "آمار کلی لینک‌های صفحه.",
      fix: internal === 0 ? "چند لینک داخلی مرتبط اضافه کن." : ""
    });

    /* ---------------- 6. Canonical / Robots / Indexability ---------------- */
    const canons = Array.from(doc.querySelectorAll('link[rel="canonical" i]'));
    if (!canons.length) {
      add({
        severity: SEV.WARN, category: "ایندکس", code: "CANON_MISSING",
        title: "تگ Canonical وجود ندارد",
        detail: "بدون canonical، ریسک محتوای تکراری بالا می‌رود.",
        fix: '<link rel="canonical" href="آدرس اصلی صفحه"> اضافه کن.'
      });
    } else if (canons.length > 1) {
      add({
        severity: SEV.ERROR, category: "ایندکس", code: "CANON_DUP",
        title: `${canons.length} تگ Canonical`,
        detail: "چند canonical یعنی گوگل همه را نادیده می‌گیرد.",
        fix: "فقط یکی بگذار.", els: canons
      });
    } else {
      const href = canons[0].getAttribute("href") || "";
      let same = false;
      try {
        const c = new URL(href, location.href);
        same = c.origin + c.pathname === location.origin + location.pathname;
      } catch (e) { /* ignore */ }
      if (!href) {
        add({
          severity: SEV.ERROR, category: "ایندکس", code: "CANON_EMPTY",
          title: "Canonical خالی است", detail: "href خالی به صفحه اصلی سایت اشاره می‌کند.",
          fix: "آدرس کامل و مطلق بگذار.", els: canons
        });
      } else if (!same) {
        add({
          severity: SEV.WARN, category: "ایندکس", code: "CANON_OTHER",
          title: "Canonical به آدرس دیگری اشاره می‌کند",
          detail: `canonical: ${href}`,
          fix: "اگر عمدی نیست، اصلاحش کن — این صفحه ایندکس نمی‌شود.", els: canons
        });
      } else {
        add({
          severity: SEV.PASS, category: "ایندکس", code: "CANON_OK",
          title: "Canonical درست تنظیم شده", detail: href, els: canons
        });
      }
    }

    const robots = Array.from(doc.querySelectorAll('meta[name="robots" i], meta[name="googlebot" i]'));
    const robotsContent = robots.map((m) => (m.getAttribute("content") || "").toLowerCase()).join(",");
    if (robotsContent.includes("noindex")) {
      add({
        severity: SEV.ERROR, category: "ایندکس", code: "NOINDEX",
        title: "صفحه noindex است!",
        detail: `meta robots: ${robotsContent}`,
        fix: "اگر می‌خواهی این صفحه در گوگل بیاید، noindex را بردار.", els: robots
      });
    }
    if (robotsContent.includes("nofollow")) {
      add({
        severity: SEV.WARN, category: "ایندکس", code: "META_NOFOLLOW",
        title: "همه لینک‌های صفحه nofollow شده‌اند",
        detail: `meta robots: ${robotsContent}`, fix: "در صورت عمدی نبودن، nofollow را بردار.", els: robots
      });
    }

    const hreflangs = Array.from(doc.querySelectorAll('link[rel="alternate" i][hreflang]'));
    const htmlLang = doc.documentElement.getAttribute("lang");
    if (!htmlLang) {
      add({
        severity: SEV.WARN, category: "ایندکس", code: "NO_LANG",
        title: "تگ html بدون attribute lang",
        detail: "زبان صفحه مشخص نیست.",
        fix: '<html lang="fa" dir="rtl"> بگذار.', els: [doc.documentElement]
      });
    }
    if (hreflangs.length) {
      const selfRef = hreflangs.some((l) => {
        try { return new URL(l.getAttribute("href"), location.href).href.split("#")[0] === location.href.split("#")[0]; }
        catch (e) { return false; }
      });
      if (!selfRef) {
        add({
          severity: SEV.WARN, category: "ایندکس", code: "HREFLANG_NO_SELF",
          title: "hreflang بدون ارجاع به خود صفحه",
          detail: `${hreflangs.length} تگ hreflang دارد ولی self-referencing نیست.`,
          fix: "یک hreflang به خود این صفحه اضافه کن.", els: hreflangs
        });
      }
    }

    /* ---------------- 7. Open Graph & Twitter ---------------- */
    const og = {};
    doc.querySelectorAll('meta[property^="og:" i]').forEach((m) => {
      og[(m.getAttribute("property") || "").toLowerCase()] = txt(m.getAttribute("content"));
    });
    const missingOg = ["og:title", "og:description", "og:image"].filter((k) => !og[k]);
    if (missingOg.length === 3) {
      add({
        severity: SEV.WARN, category: "شبکه‌های اجتماعی", code: "OG_MISSING",
        title: "هیچ تگ Open Graph ندارد",
        detail: "هنگام اشتراک‌گذاری در تلگرام/لینکدین/واتساپ پیش‌نمایش زشتی نشان داده می‌شود.",
        fix: "og:title، og:description، og:image و og:url را اضافه کن."
      });
    } else if (missingOg.length) {
      add({
        severity: SEV.WARN, category: "شبکه‌های اجتماعی", code: "OG_PARTIAL",
        title: `تگ‌های Open Graph ناقص: ${missingOg.join("، ")}`,
        detail: "پیش‌نمایش اشتراک‌گذاری کامل نمی‌شود.",
        fix: "تگ‌های جاافتاده را اضافه کن.",
        els: Array.from(doc.querySelectorAll('meta[property^="og:" i]'))
      });
    } else {
      add({
        severity: SEV.PASS, category: "شبکه‌های اجتماعی", code: "OG_OK",
        title: "تگ‌های Open Graph کامل است", detail: og["og:title"] || ""
      });
    }
    if (!doc.querySelector('meta[name="twitter:card" i]')) {
      add({
        severity: SEV.INFO, category: "شبکه‌های اجتماعی", code: "TW_MISSING",
        title: "تگ twitter:card ندارد",
        detail: "کارت اشتراک‌گذاری در X/توییتر ساخته نمی‌شود.",
        fix: '<meta name="twitter:card" content="summary_large_image"> اضافه کن.'
      });
    }

    /* ---------------- 8. Structured data ---------------- */
    const ldjson = Array.from(doc.querySelectorAll('script[type="application/ld+json" i]'));
    const microdata = doc.querySelectorAll("[itemscope]").length;
    if (!ldjson.length && !microdata) {
      add({
        severity: SEV.WARN, category: "داده ساختاریافته", code: "SD_MISSING",
        title: "هیچ داده ساختاریافته‌ای (Schema) ندارد",
        detail: "بدون schema، ریچ‌ریزالت (ستاره، قیمت، FAQ) نمی‌گیری.",
        fix: "JSON-LD مناسب نوع صفحه اضافه کن (Article، Product، FAQPage، Organization…)."
      });
    } else {
      const broken = [];
      const types = [];
      ldjson.forEach((s) => {
        try {
          const data = JSON.parse(s.textContent);
          const arr = Array.isArray(data) ? data : [data];
          arr.forEach((d) => {
            if (d && d["@type"]) types.push([].concat(d["@type"]).join("/"));
            if (d && d["@graph"]) [].concat(d["@graph"]).forEach((g) => g && g["@type"] && types.push([].concat(g["@type"]).join("/")));
          });
        } catch (e) {
          broken.push(s);
        }
      });
      if (broken.length) {
        add({
          severity: SEV.ERROR, category: "داده ساختاریافته", code: "SD_INVALID",
          title: `${broken.length} بلاک JSON-LD خراب است`,
          detail: "JSON نامعتبر کاملاً نادیده گرفته می‌شود.",
          fix: "با Rich Results Test گوگل اعتبارسنجی کن.", els: broken
        });
      }
      if (types.length) {
        add({
          severity: SEV.PASS, category: "داده ساختاریافته", code: "SD_OK",
          title: `داده ساختاریافته دارد: ${Array.from(new Set(types)).slice(0, 6).join("، ")}`,
          detail: `${ldjson.length} بلاک JSON-LD${microdata ? ` + ${microdata} المان microdata` : ""}`, els: ldjson
        });
      }
    }

    /* ---------------- 9. Technical & performance ---------------- */
    const viewport = doc.querySelector('meta[name="viewport" i]');
    if (!viewport) {
      add({
        severity: SEV.ERROR, category: "فنی", code: "NO_VIEWPORT",
        title: "متا viewport ندارد",
        detail: "صفحه در موبایل درست نمایش داده نمی‌شود و موبایل‌فرندلی محسوب نمی‌شود.",
        fix: '<meta name="viewport" content="width=device-width, initial-scale=1"> اضافه کن.'
      });
    } else {
      const c = (viewport.getAttribute("content") || "").toLowerCase();
      if (c.includes("user-scalable=no") || /maximum-scale=\s*1(\.0)?\b/.test(c)) {
        add({
          severity: SEV.WARN, category: "فنی", code: "VIEWPORT_NOZOOM",
          title: "زوم در موبایل غیرفعال شده",
          detail: c, fix: "user-scalable=no و maximum-scale را بردار (مشکل دسترسی‌پذیری).", els: [viewport]
        });
      }
    }
    if (!doc.querySelector("meta[charset], meta[http-equiv='Content-Type' i]")) {
      add({
        severity: SEV.WARN, category: "فنی", code: "NO_CHARSET",
        title: "متا charset تعریف نشده",
        detail: "ریسک به‌هم‌ریختن فارسی و کاراکترهای یونیکد.",
        fix: '<meta charset="utf-8"> را اول <head> بگذار.'
      });
    }
    if (!doc.querySelector('link[rel~="icon" i]')) {
      add({
        severity: SEV.INFO, category: "فنی", code: "NO_FAVICON",
        title: "favicon تعریف نشده", detail: "در نتایج موبایل گوگل هم نمایش داده می‌شود.",
        fix: '<link rel="icon" href="/favicon.ico"> اضافه کن.'
      });
    }

    // mixed content (http resources on an https page)
    if (isHttps) {
      const mixed = Array.from(doc.querySelectorAll('img[src^="http:"], script[src^="http:"], link[href^="http:"], iframe[src^="http:"], video[src^="http:"], source[src^="http:"]'));
      if (mixed.length) {
        add({
          severity: SEV.ERROR, category: "فنی", code: "MIXED_CONTENT",
          title: `${mixed.length} منبع ناامن (http) در صفحه https`,
          detail: "مرورگر این منابع را بلاک می‌کند و قفل امنیتی می‌شکند.",
          fix: "همه آدرس‌ها را به https تغییر بده.", els: mixed
        });
      }
    } else {
      add({
        severity: SEV.ERROR, category: "فنی", code: "NO_HTTPS",
        title: "صفحه روی HTTPS نیست",
        detail: "HTTPS یک فاکتور رتبه‌بندی تاییدشده گوگل است.",
        fix: "SSL نصب کن و کل ترافیک را ریدایرکت کن."
      });
    }

    // render-blocking scripts
    const blockingScripts = Array.from(doc.querySelectorAll("head script[src]")).filter(
      (s) => !s.async && !s.defer && s.type !== "module"
    );
    if (blockingScripts.length) {
      add({
        severity: SEV.WARN, category: "پرفورمنس", code: "BLOCKING_JS",
        title: `${blockingScripts.length} اسکریپت بلاک‌کننده رندر در <head>`,
        detail: "رندر اولیه صفحه تا دانلود این فایل‌ها متوقف می‌ماند.",
        fix: "به این تگ‌ها defer یا async بده یا به انتهای body ببر.", els: blockingScripts
      });
    }

    // word count
    const bodyClone = doc.body ? doc.body.cloneNode(true) : null;
    let words = 0;
    if (bodyClone) {
      bodyClone.querySelectorAll("script,style,noscript,nav,footer,header,svg,template").forEach((n) => n.remove());
      words = txt(bodyClone.textContent).split(/\s+/).filter((w) => w.length > 1).length;
    }
    if (words < 300) {
      add({
        severity: words < 150 ? SEV.WARN : SEV.INFO, category: "ساختار محتوا", code: "THIN_CONTENT",
        title: `محتوای کم: حدود ${words} کلمه`,
        detail: "صفحات کم‌محتوا معمولاً سخت رتبه می‌گیرند (مگر صفحات ابزاری/فرود).",
        fix: "محتوای مفید و عمیق‌تر اضافه کن."
      });
    } else {
      add({
        severity: SEV.PASS, category: "ساختار محتوا", code: "CONTENT_OK",
        title: `حجم محتوا مناسب: حدود ${words} کلمه`, detail: ""
      });
    }

    // iframes without a title
    const iframes = Array.from(doc.querySelectorAll("iframe")).filter((f) => !f.getAttribute("title") && isVisible(f));
    if (iframes.length) {
      add({
        severity: SEV.INFO, category: "دسترسی‌پذیری", code: "IFRAME_NO_TITLE",
        title: `${iframes.length} آیفریم بدون title`,
        detail: "برای اسکرین‌ریدرها نامفهوم است.",
        fix: "attribute title توصیفی بگذار.", els: iframes
      });
    }

    // form fields without labels
    const unlabeled = Array.from(doc.querySelectorAll("input, textarea, select")).filter((el) => {
      if (!isVisible(el)) return false;
      const t = (el.getAttribute("type") || "").toLowerCase();
      if (["hidden", "submit", "button", "image", "reset"].includes(t)) return false;
      if (el.getAttribute("aria-label") || el.getAttribute("aria-labelledby") || el.getAttribute("title")) return false;
      if (el.id && doc.querySelector(`label[for="${CSS.escape(el.id)}"]`)) return false;
      if (el.closest("label")) return false;
      return true;
    });
    if (unlabeled.length) {
      add({
        severity: SEV.WARN, category: "دسترسی‌پذیری", code: "INPUT_NO_LABEL",
        title: `${unlabeled.length} فیلد فرم بدون لیبل`,
        detail: "دسترسی‌پذیری و نرخ تبدیل هر دو ضربه می‌خورند.",
        fix: "<label for> یا aria-label اضافه کن.", els: unlabeled
      });
    }

    // URL
    const path = location.pathname;
    if (path.length > 100) {
      add({
        severity: SEV.INFO, category: "فنی", code: "URL_LONG",
        title: `آدرس صفحه خیلی بلند است (${path.length} کاراکتر)`,
        detail: path, fix: "آدرس کوتاه و خوانا بهتر است."
      });
    }
    if (/[A-Z]/.test(path)) {
      add({
        severity: SEV.INFO, category: "فنی", code: "URL_UPPER",
        title: "آدرس صفحه حروف بزرگ دارد",
        detail: path, fix: "همه آدرس‌ها را lowercase کن تا محتوای تکراری ایجاد نشود."
      });
    }
    if (/[_]/.test(path)) {
      add({
        severity: SEV.INFO, category: "فنی", code: "URL_UNDERSCORE",
        title: "آدرس صفحه از آندرلاین استفاده می‌کند",
        detail: path, fix: "گوگل خط تیره (-) را جداکننده کلمه می‌داند، نه _ را."
      });
    }

    /* ---------------- Scoring ---------------- */
    const errors = issues.filter((i) => i.severity === SEV.ERROR).length;
    const warnings = issues.filter((i) => i.severity === SEV.WARN).length;
    const infos = issues.filter((i) => i.severity === SEV.INFO && i.fix).length;
    const passes = issues.filter((i) => i.severity === SEV.PASS).length;
    let score = 100 - errors * 9 - warnings * 4 - infos * 1;
    score = Math.max(0, Math.min(100, Math.round(score)));

    const order = { error: 0, warning: 1, info: 2, pass: 3 };
    issues.sort((a, b) => order[a.severity] - order[b.severity]);
    issues.forEach((i) => {
      i.els = (i.els || []).filter((e) => e && e.nodeType === 1);
      i.paths = i.els.slice(0, 12).map((e) => ({ path: cssPath(e), text: snippet(e) }));
      i.count = i.els.length;
      i.highlightable = i.els.some((e) => e.tagName !== "TITLE" && e.tagName !== "META" && e.tagName !== "LINK" && e.tagName !== "SCRIPT");
    });

    return {
      url: pageUrl,
      title,
      score,
      counts: { errors, warnings, infos, passes, total: issues.length },
      issues,
      generatedAt: new Date().toISOString()
    };
  }

  window.__SEO_LENS_AUDIT__ = run;
})();
