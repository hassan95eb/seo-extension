/*  SEO Lens — SEO issues, highlighted on the page
 *  hassan mode : on
 *  https://github.com/hassan95eb/seo-extension
 */
/* SEO Lens — i18n catalog (fa + en) */
(function () {
  if (window.__SEO_LENS_I18N__) return;

  const UI = {
    fa: {
      dir: "rtl",
      lang: "fa",
      appName: "SEO Lens",
      analyzing: "در حال تحلیل…",
      summary: "{e} ایراد جدی · {w} هشدار · {i} نکته · {p} مورد سالم",
      hlAll: "هایلایت همه ایرادها",
      hlAllOff: "خاموش کردن هایلایت همه",
      clear: "پاک کردن",
      copy: "کپی گزارش",
      pdf: "گزارش PDF",
      rescan: "تحلیل مجدد",
      close: "بستن",
      langBtn: "EN",
      fAll: "همه",
      fError: "جدی",
      fWarn: "هشدار",
      fInfo: "نکته",
      fPass: "سالم",
      empty: "در این دسته چیزی پیدا نشد 🎉",
      failed: "تحلیل انجام نشد. صفحه را رفرش کن و دوباره امتحان کن.",
      foot: "روی هر ایراد کلیک کن تا روی صفحه نشانت بدهد",
      showOnPage: "نمایش روی صفحه ↖",
      inHead: "این مورد داخل <head> است و روی صفحه دیده نمی‌شود.",
      pageLevel: "مربوط به کل صفحه است، نه یک المان خاص.",
      fixLabel: "راه‌حل:",
      elements: "{n} المان",
      copied: "گزارش کپی شد ✓",
      copyFail: "کپی نشد — دسترسی کلیپ‌بورد بسته است",
      pdfOpening: "در حال باز کردن گزارش…",
      sevError: "ایراد جدی",
      sevWarning: "هشدار",
      sevInfo: "نکته",
      sevPass: "درست است",
      sevStat: "آمار",
      // report page
      rTitle: "گزارش تحلیل سئو",
      rScore: "امتیاز سئو",
      rOf100: "از ۱۰۰",
      rDate: "تاریخ گزارش",
      rUrl: "آدرس صفحه",
      rPageTitle: "عنوان صفحه",
      rErrors: "ایراد جدی",
      rWarnings: "هشدار",
      rInfos: "نکته",
      rPasses: "مورد سالم",
      rOverview: "خلاصه وضعیت",
      rDetails: "جزئیات یافته‌ها",
      rFix: "راه‌حل پیشنهادی",
      rElements: "المان‌های مربوطه",
      rNoIssues: "هیچ ایرادی پیدا نشد.",
      rPrint: "ذخیره به‌صورت PDF / چاپ",
      rLogo: "انتخاب لوگوی سفارشی",
      rLogoClear: "حذف لوگو",
      rHint: "در پنجره چاپ، مقصد را روی «Save as PDF» بگذار.",
      rFooter: "تولیدشده با SEO Lens",
      rPage: "صفحه",
      rGoodJob: "این موارد درست پیاده‌سازی شده‌اند",
      catcore: "تگ‌های اصلی",
      catcontent: "ساختار محتوا",
      catimages: "تصاویر",
      catperf: "پرفورمنس",
      catlinks: "لینک‌ها",
      catindex: "ایندکس",
      catsocial: "شبکه‌های اجتماعی",
      catsd: "داده ساختاریافته",
      cattech: "فنی",
      cata11y: "دسترسی‌پذیری"
    },
    en: {
      dir: "ltr",
      lang: "en",
      appName: "SEO Lens",
      analyzing: "Analyzing…",
      summary: "{e} errors · {w} warnings · {i} notices · {p} passed",
      hlAll: "Highlight all issues",
      hlAllOff: "Turn off highlighting",
      clear: "Clear",
      copy: "Copy report",
      pdf: "PDF report",
      rescan: "Re-scan",
      close: "Close",
      langBtn: "فا",
      fAll: "All",
      fError: "Errors",
      fWarn: "Warnings",
      fInfo: "Notices",
      fPass: "Passed",
      empty: "Nothing found in this group 🎉",
      failed: "Analysis failed. Reload the page and try again.",
      foot: "Click any issue to reveal it on the page",
      showOnPage: "Show on page ↖",
      inHead: "This lives inside <head> and is not visible on the page.",
      pageLevel: "Applies to the whole page, not a specific element.",
      fixLabel: "Fix:",
      elements: "{n} elements",
      copied: "Report copied ✓",
      copyFail: "Copy failed — clipboard access is blocked",
      pdfOpening: "Opening report…",
      sevError: "Error",
      sevWarning: "Warning",
      sevInfo: "Notice",
      sevPass: "Passed",
      sevStat: "Stats",
      rTitle: "SEO Audit Report",
      rScore: "SEO Score",
      rOf100: "out of 100",
      rDate: "Report date",
      rUrl: "Page URL",
      rPageTitle: "Page title",
      rErrors: "Errors",
      rWarnings: "Warnings",
      rInfos: "Notices",
      rPasses: "Passed",
      rOverview: "Overview",
      rDetails: "Findings",
      rFix: "Recommended fix",
      rElements: "Affected elements",
      rNoIssues: "No issues found.",
      rPrint: "Save as PDF / Print",
      rLogo: "Choose custom logo",
      rLogoClear: "Remove logo",
      rHint: "In the print dialog, set the destination to “Save as PDF”.",
      rFooter: "Generated with SEO Lens",
      rPage: "Page",
      rGoodJob: "These are correctly implemented",
      catcore: "Core tags",
      catcontent: "Content structure",
      catimages: "Images",
      catperf: "Performance",
      catlinks: "Links",
      catindex: "Indexability",
      catsocial: "Social",
      catsd: "Structured data",
      cattech: "Technical",
      cata11y: "Accessibility"
    }
  };

  // t = title, d = description, f = suggested fix
  const M = {
    TITLE_MISSING: {
      fa: { t: "تگ Title وجود ندارد", d: "صفحه هیچ عنوانی ندارد؛ گوگل مجبور می‌شود عنوان را خودش بسازد.", f: "‏<title> با ۵۰ تا ۶۰ کاراکتر و کلمه کلیدی اصلی در <head> اضافه کن." },
      en: { t: "Missing <title> tag", d: "The page has no title, so Google will invent one from the content.", f: "Add a 50–60 character <title> containing your primary keyword." }
    },
    TITLE_DUP: {
      fa: { t: "{n} تگ Title در صفحه هست", d: "فقط اولین تگ خوانده می‌شود و بقیه باعث سردرگمی خزنده می‌شوند.", f: "تگ‌های اضافی Title را حذف کن." },
      en: { t: "{n} <title> tags on the page", d: "Only the first one is used; the rest confuse crawlers.", f: "Remove the duplicate <title> tags." }
    },
    TITLE_SHORT: {
      fa: { t: "Title خیلی کوتاه است ({n} کاراکتر / {px} پیکسل)", d: "عرض مجاز گوگل حدود {max} پیکسل است و داری از آن استفاده نمی‌کنی.", f: "بین ۳۰ تا ۶۰ کاراکتر بنویس تا فضای نتایج جستجو هدر نرود." },
      en: { t: "Title is too short ({n} characters / {px}px)", d: "Google gives you about {max}px and you are leaving most of it empty.", f: "Aim for 30–60 characters so you use the full SERP width." }
    },
    TITLE_LONG: {
      fa: { t: "Title خیلی بلند است ({n} کاراکتر)", d: "احتمالاً در نتایج جستجو بریده می‌شود.", f: "به زیر ۶۰ کاراکتر کوتاهش کن." },
      en: { t: "Title is too long ({n} characters)", d: "It will likely be truncated in search results.", f: "Shorten it to under 60 characters." }
    },
    TITLE_PX_LONG: {
      fa: {
        t: "Title از عرض نتایج گوگل بیرون می‌زند ({px} پیکسل از {max})",
        d: "گوگل عنوان را بر اساس عرض رندرشده می‌برد، نه تعداد کاراکتر. این عنوان {n} کاراکتر دارد و با فونت نتایج جستجو {px} پیکسل عرض می‌گیرد.",
        f: "عنوان را کوتاه کن تا زیر {max} پیکسل بیاید — در فارسی طول کاراکتری معیار قابل اعتمادی نیست، چون اتصال حروف عرض را به‌شدت تغییر می‌دهد."
      },
      en: {
        t: "Title overflows the SERP width ({px}px of {max}px)",
        d: "Google truncates by rendered width, not character count. This title is {n} characters and measures {px}px in the SERP font.",
        f: "Trim it below {max}px — character count is a noisy proxy, and noticeably noisier in Persian and Arabic, where cursive joining changes glyph width."
      }
    },
    TITLE_OK: {
      fa: { t: "Title مناسب است ({n} کاراکتر / {px} پیکسل)", d: "", f: "" },
      en: { t: "Title length is good ({n} characters / {px}px)", d: "", f: "" }
    },
    DESC_MISSING: {
      fa: { t: "Meta Description وجود ندارد", d: "توضیح متا روی نرخ کلیک (CTR) اثر مستقیم دارد.", f: '<meta name="description" content="۱۲۰ تا ۱۵۵ کاراکتر توضیح جذاب"> را اضافه کن.' },
      en: { t: "Missing meta description", d: "The description directly affects click-through rate from search results.", f: 'Add <meta name="description" content="120–155 compelling characters">.' }
    },
    DESC_DUP: {
      fa: { t: "{n} تگ Meta Description تکراری", d: "فقط یکی باید وجود داشته باشد.", f: "بقیه را حذف کن." },
      en: { t: "{n} duplicate meta description tags", d: "Only one should exist.", f: "Remove the extras." }
    },
    DESC_SHORT: {
      fa: { t: "Meta Description کوتاه است ({n} کاراکتر / {px} پیکسل)", d: "", f: "به ۱۲۰ تا ۱۵۵ کاراکتر برسان." },
      en: { t: "Meta description is short ({n} characters / {px}px)", d: "", f: "Expand it to 120–155 characters." }
    },
    DESC_LONG: {
      fa: { t: "Meta Description بلند است ({n} کاراکتر)", d: "در نتایج جستجو با «…» بریده می‌شود.", f: "به زیر ۱۶۰ کاراکتر کوتاهش کن." },
      en: { t: "Meta description is long ({n} characters)", d: "It will be cut off with an ellipsis in search results.", f: "Trim it to under 160 characters." }
    },
    DESC_PX_LONG: {
      fa: {
        t: "Meta Description از عرض اسنیپت بیرون می‌زند ({px} پیکسل از {max})",
        d: "اسنیپت بر اساس عرض رندرشده بریده می‌شود، نه تعداد کاراکتر. این توضیح {n} کاراکتر و {px} پیکسل است.",
        f: "مهم‌ترین جمله را اول بیاور و توضیح را زیر {max} پیکسل نگه دار."
      },
      en: {
        t: "Meta description overflows the snippet width ({px}px of {max}px)",
        d: "Snippets are cut by rendered width, not character count. This description is {n} characters and measures {px}px.",
        f: "Front-load the important sentence and keep the description under {max}px."
      }
    },
    DESC_OK: {
      fa: { t: "Meta Description مناسب است ({n} کاراکتر / {px} پیکسل)", d: "", f: "" },
      en: { t: "Meta description length is good ({n} characters / {px}px)", d: "", f: "" }
    },
    H1_MISSING: {
      fa: { t: "صفحه هیچ H1 ندارد", d: "H1 مهم‌ترین سیگنال موضوع صفحه است.", f: "یک H1 یکتا شامل کلمه کلیدی اصلی اضافه کن." },
      en: { t: "No H1 on the page", d: "H1 is the strongest on-page topic signal.", f: "Add one unique H1 containing your primary keyword." }
    },
    H1_MULTI: {
      fa: { t: "{n} تگ H1 در صفحه هست", d: "بهتر است هر صفحه فقط یک H1 داشته باشد.", f: "بقیه را به H2 تبدیل کن." },
      en: { t: "{n} H1 tags on the page", d: "A page should normally have exactly one H1.", f: "Convert the extras to H2." }
    },
    H1_EMPTY: {
      fa: { t: "H1 خالی است", d: "تگ H1 هیچ متنی ندارد.", f: "داخل H1 متن معنادار بگذار (اگر لوگوست، از alt استفاده کن)." },
      en: { t: "H1 is empty", d: "The H1 tag contains no text.", f: "Put meaningful text inside it (if it wraps a logo, use the image alt)." }
    },
    H1_OK: {
      fa: { t: "یک H1 یکتا دارد", d: "", f: "" },
      en: { t: "Exactly one H1", d: "", f: "" }
    },
    H1_HIDDEN: {
      fa: { t: "H1 برای کاربر نمایش داده نمی‌شود", d: "H1 مخفی است (display:none یا visibility:hidden).", f: "H1 قابل مشاهده بگذار؛ متن مخفی ریسک اسپم دارد." },
      en: { t: "H1 is hidden from users", d: "The H1 is hidden via display:none or visibility:hidden.", f: "Make the H1 visible — hidden text carries spam risk." }
    },
    H_SKIP: {
      fa: { t: "{n} پرش در ترتیب هدینگ‌ها", d: "", f: "ترتیب هدینگ‌ها را پلکانی کن (H2 بعد H1، H3 بعد H2)." },
      en: { t: "{n} heading level skips", d: "", f: "Keep headings sequential (H2 after H1, H3 after H2)." }
    },
    H_EMPTY: {
      fa: { t: "{n} هدینگ خالی", d: "تگ هدینگ بدون متن، ساختار صفحه را به هم می‌ریزد.", f: "یا متن بگذار یا تگ را به div تبدیل کن." },
      en: { t: "{n} empty headings", d: "Headings without text break the page outline.", f: "Add text or change the tag to a div." }
    },
    IMG_NO_ALT: {
      fa: { t: "{n} تصویر بدون attribute alt", d: "تصاویر بدون alt نه در جستجوی تصویر دیده می‌شوند نه برای اسکرین‌ریدر قابل فهم‌اند.", f: 'برای هر تصویر alt توصیفی بنویس؛ اگر تزئینی است alt="" بگذار.' },
      en: { t: "{n} images without an alt attribute", d: "They can't rank in image search and are unreadable for screen readers.", f: 'Write a descriptive alt; use alt="" only for decorative images.' }
    },
    IMG_EMPTY_ALT: {
      fa: { t: "{n} تصویر بزرگ با alt خالی", d: 'alt="" یعنی تصویر تزئینی؛ برای تصاویر محتوایی درست نیست.', f: "اگر تصویر معنادار است، متن alt بنویس." },
      en: { t: "{n} large images with an empty alt", d: 'alt="" declares the image decorative, which is wrong for content images.', f: "Write real alt text for meaningful images." }
    },
    IMG_LONG_ALT: {
      fa: { t: "{n} تصویر با alt خیلی بلند", d: "alt بیش از ۱۲۵ کاراکتر توسط اسکرین‌ریدرها بریده می‌شود.", f: "alt را کوتاه و توصیفی کن." },
      en: { t: "{n} images with overly long alt text", d: "Screen readers truncate alt text beyond ~125 characters.", f: "Keep alt text short and descriptive." }
    },
    IMG_NO_DIM: {
      fa: { t: "{n} تصویر بدون width/height", d: "نبود ابعاد باعث پرش لایوت (CLS) و افت Core Web Vitals می‌شود.", f: "روی تگ img مقدار width و height بگذار یا aspect-ratio تعریف کن." },
      en: { t: "{n} images without width/height", d: "Missing dimensions cause layout shift (CLS) and hurt Core Web Vitals.", f: "Set width and height attributes, or define an aspect-ratio." }
    },
    IMG_OVERSIZED: {
      fa: { t: "{n} تصویر بزرگ‌تر از نیاز بارگذاری شده", d: "", f: "تصویر را در اندازه واقعی نمایش سرو کن یا از srcset استفاده کن." },
      en: { t: "{n} images served larger than displayed", d: "", f: "Serve them at display size or use srcset." }
    },
    IMG_NO_LAZY: {
      fa: { t: "{n} تصویر پایین صفحه بدون lazy-load", d: "این تصاویر همان اول بارگذاری می‌شوند و LCP را کند می‌کنند.", f: 'loading="lazy" اضافه کن (به تصاویر بالای صفحه نزن).' },
      en: { t: "{n} below-the-fold images without lazy loading", d: "They load immediately and slow down LCP.", f: 'Add loading="lazy" (never to above-the-fold images).' }
    },
    IMG_GENERIC_NAME: {
      fa: { t: "{n} تصویر با نام فایل بی‌معنی", d: "مثل IMG_1234.jpg — سیگنال سئوی تصویر را از دست می‌دهی.", f: "نام فایل را توصیفی و با خط تیره بنویس." },
      en: { t: "{n} images with generic filenames", d: "Names like IMG_1234.jpg waste an image-SEO signal.", f: "Use descriptive, hyphen-separated filenames." }
    },
    A_EMPTY: {
      fa: { t: "{n} لینک بدون متن قابل خواندن", d: "گوگل و اسکرین‌ریدر نمی‌فهمند این لینک به کجا می‌رود.", f: "متن لینک بگذار یا aria-label اضافه کن." },
      en: { t: "{n} links with no readable text", d: "Neither Google nor screen readers can tell where the link goes.", f: "Add link text or an aria-label." }
    },
    A_GENERIC: {
      fa: { t: "{n} لینک با انکر تکست کلیشه‌ای", d: "مثل «اینجا کلیک کنید» یا «بیشتر» — هیچ سیگنال موضوعی منتقل نمی‌کند.", f: "انکر تکست توصیفی بنویس؛ مثلاً «راهنمای قیمت‌گذاری»." },
      en: { t: "{n} links with generic anchor text", d: '"Click here" or "read more" pass no topical signal.', f: 'Use descriptive anchors, e.g. "pricing guide".' }
    },
    A_HASH: {
      fa: { t: '{n} لینک با href="#" یا javascript:', d: "این‌ها لینک واقعی نیستند و خزنده دنبالشان نمی‌رود.", f: "اگر دکمه است از <button> استفاده کن." },
      en: { t: '{n} links using href="#" or javascript:', d: "These aren't real links and crawlers won't follow them.", f: "Use <button> if it's an action, not a link." }
    },
    A_NO_HREF: {
      fa: { t: "{n} تگ <a> بدون href", d: "بدون href، تگ a اصلاً لینک محسوب نمی‌شود.", f: "href بگذار یا تگ را عوض کن." },
      en: { t: "{n} <a> tags without href", d: "Without href an anchor isn't a link at all.", f: "Add an href or change the element." }
    },
    A_UNSAFE_BLANK: {
      fa: { t: '{n} لینک target="_blank" بدون rel="noopener"', d: "ریسک امنیتی tabnabbing و افت پرفورمنس.", f: 'rel="noopener noreferrer" اضافه کن.' },
      en: { t: '{n} target="_blank" links without rel="noopener"', d: "Exposes you to tabnabbing and hurts performance.", f: 'Add rel="noopener noreferrer".' }
    },
    A_NOFOLLOW_INTERNAL: {
      fa: { t: "{n} لینک داخلی nofollow شده", d: "nofollow روی لینک داخلی، جریان اعتبار سایت را قطع می‌کند.", f: "nofollow را از لینک‌های داخلی بردار." },
      en: { t: "{n} internal links marked nofollow", d: "Nofollow on internal links blocks your own link equity.", f: "Remove nofollow from internal links." }
    },
    A_STATS: {
      fa: { t: "{i} لینک داخلی، {e} لینک خارجی", d: "آمار کلی لینک‌های صفحه.", f: "" },
      en: { t: "{i} internal links, {e} external links", d: "Overall link profile of the page.", f: "" }
    },
    A_STATS_NF: {
      fa: { t: "{i} لینک داخلی، {e} لینک خارجی، {nf} لینک nofollow", d: "آمار کلی لینک‌های صفحه.", f: "" },
      en: { t: "{i} internal links, {e} external links, {nf} nofollow", d: "Overall link profile of the page.", f: "" }
    },
    A_NO_INTERNAL: {
      fa: { t: "هیچ لینک داخلی در صفحه نیست", d: "لینک‌سازی داخلی برای خزش و توزیع اعتبار حیاتی است.", f: "چند لینک داخلی مرتبط اضافه کن." },
      en: { t: "No internal links on the page", d: "Internal linking is essential for crawling and equity flow.", f: "Add a few relevant internal links." }
    },
    CANON_MISSING: {
      fa: { t: "تگ Canonical وجود ندارد", d: "بدون canonical، ریسک محتوای تکراری بالا می‌رود.", f: '<link rel="canonical" href="آدرس اصلی صفحه"> اضافه کن.' },
      en: { t: "No canonical tag", d: "Without a canonical you're exposed to duplicate-content issues.", f: '<link rel="canonical" href="the preferred URL">' }
    },
    CANON_DUP: {
      fa: { t: "{n} تگ Canonical", d: "چند canonical یعنی گوگل همه را نادیده می‌گیرد.", f: "فقط یکی بگذار." },
      en: { t: "{n} canonical tags", d: "Multiple canonicals make Google ignore all of them.", f: "Keep exactly one." }
    },
    CANON_EMPTY: {
      fa: { t: "Canonical خالی است", d: "href خالی به صفحه اصلی سایت اشاره می‌کند.", f: "آدرس کامل و مطلق بگذار." },
      en: { t: "Canonical href is empty", d: "An empty href resolves to the site root.", f: "Use a full absolute URL." }
    },
    CANON_OTHER: {
      fa: { t: "Canonical به آدرس دیگری اشاره می‌کند", d: "", f: "اگر عمدی نیست اصلاحش کن — این صفحه ایندکس نمی‌شود." },
      en: { t: "Canonical points to a different URL", d: "", f: "Unless intentional, fix it — this page won't be indexed." }
    },
    CANON_OK: {
      fa: { t: "Canonical درست تنظیم شده", d: "", f: "" },
      en: { t: "Canonical is self-referencing", d: "", f: "" }
    },
    NOINDEX: {
      fa: { t: "صفحه noindex است!", d: "", f: "اگر می‌خواهی این صفحه در گوگل بیاید، noindex را بردار." },
      en: { t: "Page is set to noindex!", d: "", f: "Remove noindex if this page should appear in Google." }
    },
    META_NOFOLLOW: {
      fa: { t: "همه لینک‌های صفحه nofollow شده‌اند", d: "", f: "در صورت عمدی نبودن، nofollow را بردار." },
      en: { t: "All links on the page are nofollowed", d: "", f: "Remove the page-level nofollow unless intentional." }
    },
    NO_LANG: {
      fa: { t: "تگ html بدون attribute lang", d: "زبان صفحه مشخص نیست.", f: '<html lang="fa" dir="rtl"> بگذار.' },
      en: { t: "<html> has no lang attribute", d: "The page language is undeclared.", f: 'Set <html lang="en"> (or the right locale).' }
    },
    DIR_MISSING: {
      fa: {
        t: "صفحه راست‌به‌چپ است ولی تگ html مقدار dir ندارد",
        d: "محتوای صفحه فارسی/عربی است اما جهت متن اعلام نشده؛ مرورگر ltr فرض می‌کند و علائم نگارشی، اعداد و نام‌های لاتین جابه‌جا رندر می‌شوند.",
        f: '‏dir="rtl" را روی خود تگ <html> بگذار، نه روی body یا با CSS.'
      },
      en: {
        t: "RTL page with no dir attribute on <html>",
        d: "The content is Persian or Arabic but the text direction is undeclared, so the browser assumes ltr and punctuation, digits and Latin names render in the wrong places.",
        f: 'Set dir="rtl" on the <html> element itself — not on body, and not in CSS alone.'
      }
    },
    DIR_ON_BODY: {
      fa: {
        t: "‏dir روی body تعریف شده، نه روی html",
        d: "همه‌چیز داخل body درست می‌شود ولی خود صفحه، اسکرول‌بار و متن‌های بیرون از body همچنان ltr می‌مانند.",
        f: 'همان dir="rtl" را به تگ <html> منتقل کن.'
      },
      en: {
        t: "dir is set on <body>, not on <html>",
        d: "Content inside body flips, but the document itself, the scrollbar and anything outside body stay ltr.",
        f: 'Move dir="rtl" up to the <html> element.'
      }
    },
    DIR_CONFLICT: {
      fa: {
        t: 'زبان صفحه {lang} است ولی dir روی ltr مانده',
        d: "این ترکیب متن راست‌به‌چپ را چپ‌به‌راست می‌چیند؛ یکی از رایج‌ترین ایرادهای واقعی سایت‌های فارسی و عربی است.",
        f: 'یا dir="rtl" بگذار یا اگر واقعاً محتوا لاتین است، مقدار lang را اصلاح کن.'
      },
      en: {
        t: 'Page declares lang={lang} but dir="ltr"',
        d: "This lays out right-to-left text left-to-right — one of the most common real defects on Persian and Arabic sites.",
        f: 'Either set dir="rtl", or correct lang if the content really is Latin-script.'
      }
    },
    DIR_RTL_LTR_CONTENT: {
      fa: {
        t: 'صفحه dir="rtl" دارد ولی محتوا راست‌به‌چپ نیست',
        d: "چیدمان برعکس می‌شود بدون اینکه دلیلی داشته باشد.",
        f: "اگر محتوا لاتین است، dir را بردار یا ltr بگذار." 
      },
      en: {
        t: 'Page is dir="rtl" but the content is not RTL',
        d: "The layout mirrors for no reason.",
        f: 'Remove dir, or set it to ltr, if the content is Latin-script.'
      }
    },
    DIR_OK: {
      fa: { t: "جهت متن درست اعلام شده", d: "", f: "" },
      en: { t: "Text direction is declared correctly", d: "", f: "" }
    },
    BIDI_UNISOLATED: {
      fa: {
        t: "متن دوجهته‌ی جداسازی‌نشده ({n} المان)",
        d: "نام‌های لاتین، اعداد و نسخه‌ها داخل متن فارسی بدون جداسازی، هنگام رندر جابه‌جا می‌شوند — مثلاً «iPhone 15 Pro» به شکل «Pro 15 iPhone» دیده می‌شود.",
        f: "بخش لاتین را داخل <bdi> بگذار، یا روی همان المان dir=\"auto\" یا unicode-bidi: isolate بگذار."
      },
      en: {
        t: "Unisolated bidirectional text ({n} elements)",
        d: 'Latin names, numbers and versions inside RTL text reorder when rendered — "iPhone 15 Pro" can display as "Pro 15 iPhone".',
        f: 'Wrap the Latin run in <bdi>, or put dir="auto" or unicode-bidi: isolate on the element.'
      }
    },
    HREFLANG_NO_SELF: {
      fa: { t: "hreflang بدون ارجاع به خود صفحه", d: "{n} تگ hreflang دارد ولی self-referencing نیست.", f: "یک hreflang به خود این صفحه اضافه کن." },
      en: { t: "hreflang set is not self-referencing", d: "{n} hreflang tags exist but none points to this page.", f: "Add a self-referencing hreflang." }
    },
    OG_MISSING: {
      fa: { t: "هیچ تگ Open Graph ندارد", d: "هنگام اشتراک‌گذاری در تلگرام/لینکدین/واتساپ پیش‌نمایش زشتی نشان داده می‌شود.", f: "og:title، og:description، og:image و og:url را اضافه کن." },
      en: { t: "No Open Graph tags", d: "Shares on LinkedIn, WhatsApp and Telegram will render an ugly preview.", f: "Add og:title, og:description, og:image and og:url." }
    },
    OG_PARTIAL: {
      fa: { t: "تگ‌های Open Graph ناقص است", d: "", f: "تگ‌های جاافتاده را اضافه کن." },
      en: { t: "Incomplete Open Graph tags", d: "", f: "Add the missing tags." }
    },
    OG_OK: {
      fa: { t: "تگ‌های Open Graph کامل است", d: "", f: "" },
      en: { t: "Open Graph tags are complete", d: "", f: "" }
    },
    TW_MISSING: {
      fa: { t: "تگ twitter:card ندارد", d: "کارت اشتراک‌گذاری در X/توییتر ساخته نمی‌شود.", f: '<meta name="twitter:card" content="summary_large_image"> اضافه کن.' },
      en: { t: "No twitter:card tag", d: "X/Twitter won't build a share card.", f: 'Add <meta name="twitter:card" content="summary_large_image">.' }
    },
    SD_MISSING: {
      fa: { t: "هیچ داده ساختاریافته‌ای (Schema) ندارد", d: "بدون schema، ریچ‌ریزالت (ستاره، قیمت، FAQ) نمی‌گیری.", f: "JSON-LD مناسب نوع صفحه اضافه کن (Article، Product، FAQPage، Organization…)." },
      en: { t: "No structured data (Schema)", d: "Without schema you can't earn rich results (stars, price, FAQ).", f: "Add JSON-LD matching the page type (Article, Product, FAQPage, Organization…)." }
    },
    SD_INVALID: {
      fa: { t: "{n} بلاک JSON-LD خراب است", d: "JSON نامعتبر کاملاً نادیده گرفته می‌شود.", f: "با Rich Results Test گوگل اعتبارسنجی کن." },
      en: { t: "{n} invalid JSON-LD blocks", d: "Malformed JSON is silently ignored.", f: "Validate with Google's Rich Results Test." }
    },
    SD_OK: {
      fa: { t: "داده ساختاریافته دارد", d: "", f: "" },
      en: { t: "Structured data present", d: "", f: "" }
    },
    NO_VIEWPORT: {
      fa: { t: "متا viewport ندارد", d: "صفحه در موبایل درست نمایش داده نمی‌شود و موبایل‌فرندلی محسوب نمی‌شود.", f: '<meta name="viewport" content="width=device-width, initial-scale=1"> اضافه کن.' },
      en: { t: "No viewport meta tag", d: "The page won't render correctly on mobile and fails mobile-friendliness.", f: 'Add <meta name="viewport" content="width=device-width, initial-scale=1">.' }
    },
    VIEWPORT_NOZOOM: {
      fa: { t: "زوم در موبایل غیرفعال شده", d: "", f: "user-scalable=no و maximum-scale را بردار (مشکل دسترسی‌پذیری)." },
      en: { t: "Zoom is disabled on mobile", d: "", f: "Remove user-scalable=no and maximum-scale — it's an accessibility failure." }
    },
    NO_CHARSET: {
      fa: { t: "متا charset تعریف نشده", d: "ریسک به‌هم‌ریختن فارسی و کاراکترهای یونیکد.", f: '<meta charset="utf-8"> را اول <head> بگذار.' },
      en: { t: "No charset declared", d: "Risks mojibake on non-ASCII characters.", f: 'Put <meta charset="utf-8"> first in <head>.' }
    },
    NO_FAVICON: {
      fa: { t: "favicon تعریف نشده", d: "در نتایج موبایل گوگل هم نمایش داده می‌شود.", f: '<link rel="icon" href="/favicon.ico"> اضافه کن.' },
      en: { t: "No favicon defined", d: "Google shows it in mobile search results too.", f: 'Add <link rel="icon" href="/favicon.ico">.' }
    },
    MIXED_CONTENT: {
      fa: { t: "{n} منبع ناامن (http) در صفحه https", d: "مرورگر این منابع را بلاک می‌کند و قفل امنیتی می‌شکند.", f: "همه آدرس‌ها را به https تغییر بده." },
      en: { t: "{n} insecure (http) resources on an https page", d: "Browsers block them and the padlock breaks.", f: "Switch every URL to https." }
    },
    NO_HTTPS: {
      fa: { t: "صفحه روی HTTPS نیست", d: "HTTPS یک فاکتور رتبه‌بندی تاییدشده گوگل است.", f: "SSL نصب کن و کل ترافیک را ریدایرکت کن." },
      en: { t: "Page is not served over HTTPS", d: "HTTPS is a confirmed Google ranking signal.", f: "Install SSL and redirect all traffic." }
    },
    BLOCKING_JS: {
      fa: { t: "{n} اسکریپت بلاک‌کننده رندر در <head>", d: "رندر اولیه صفحه تا دانلود این فایل‌ها متوقف می‌ماند.", f: "به این تگ‌ها defer یا async بده یا به انتهای body ببر." },
      en: { t: "{n} render-blocking scripts in <head>", d: "First render is blocked until these files download.", f: "Add defer/async or move them to the end of <body>." }
    },
    THIN_CONTENT: {
      fa: { t: "محتوای کم: حدود {n} کلمه", d: "صفحات کم‌محتوا معمولاً سخت رتبه می‌گیرند (مگر صفحات ابزاری/فرود).", f: "محتوای مفید و عمیق‌تر اضافه کن." },
      en: { t: "Thin content: about {n} words", d: "Thin pages rarely rank (landing/tool pages excepted).", f: "Add more useful, in-depth content." }
    },
    CONTENT_OK: {
      fa: { t: "حجم محتوا مناسب: حدود {n} کلمه", d: "", f: "" },
      en: { t: "Content volume is healthy: about {n} words", d: "", f: "" }
    },
    IFRAME_NO_TITLE: {
      fa: { t: "{n} آیفریم بدون title", d: "برای اسکرین‌ریدرها نامفهوم است.", f: "attribute title توصیفی بگذار." },
      en: { t: "{n} iframes without a title", d: "Screen readers can't describe them.", f: "Add a descriptive title attribute." }
    },
    INPUT_NO_LABEL: {
      fa: { t: "{n} فیلد فرم بدون لیبل", d: "دسترسی‌پذیری و نرخ تبدیل هر دو ضربه می‌خورند.", f: "<label for> یا aria-label اضافه کن." },
      en: { t: "{n} form fields without a label", d: "Hurts both accessibility and conversion rate.", f: "Add a <label for> or aria-label." }
    },
    URL_LONG: {
      fa: { t: "آدرس صفحه خیلی بلند است ({n} کاراکتر)", d: "", f: "آدرس کوتاه و خوانا بهتر است." },
      en: { t: "URL path is very long ({n} characters)", d: "", f: "Short, readable URLs perform better." }
    },
    URL_UPPER: {
      fa: { t: "آدرس صفحه حروف بزرگ دارد", d: "", f: "همه آدرس‌ها را lowercase کن تا محتوای تکراری ایجاد نشود." },
      en: { t: "URL contains uppercase letters", d: "", f: "Lowercase all URLs to avoid duplicate-content variants." }
    },
    URL_UNDERSCORE: {
      fa: { t: "آدرس صفحه از آندرلاین استفاده می‌کند", d: "", f: "گوگل خط تیره (-) را جداکننده کلمه می‌داند، نه _ را." },
      en: { t: "URL uses underscores", d: "", f: "Google treats hyphens as word separators, not underscores." }
    },

    /* --- HTTP response headers (X-Robots-Tag) --- */
    HDR_NOINDEX: {
      fa: {
        t: "‏noindex از طریق هدر X-Robots-Tag!",
        d: "این noindex هیچ‌جای HTML نیست و در سورس صفحه دیده نمی‌شود؛ ابزارهایی که فقط DOM را می‌خوانند صفحه را کاملاً سالم گزارش می‌کنند در حالی که از ایندکس خارج شده است.",
        f: "هدر X-Robots-Tag را در تنظیمات سرور، CDN یا پلاگین سئو پیدا کن و بردار." 
      },
      en: {
        t: "noindex delivered as an X-Robots-Tag header!",
        d: "This noindex appears nowhere in the HTML, so DOM-only auditors report the page as perfectly fine while it stays out of the index.",
        f: "Find the X-Robots-Tag in your server config, CDN rules or SEO plugin and remove it."
      }
    },
    HDR_NOFOLLOW: {
      fa: {
        t: "‏nofollow از طریق هدر X-Robots-Tag",
        d: "همه لینک‌های این صفحه در سطح هدر nofollow شده‌اند.",
        f: "اگر عمدی نیست، از مقدار هدر حذفش کن."
      },
      en: {
        t: "nofollow delivered as an X-Robots-Tag header",
        d: "Every link on the page is nofollowed at the header level.",
        f: "Remove it from the header value unless it is intentional."
      }
    },
    HDR_NOSNIPPET: {
      fa: {
        t: "‏nosnippet یا max-snippet:0 در هدر",
        d: "این دستور اسنیپت متنی صفحه را حذف می‌کند و طبق مستندات گوگل جلوی استفاده از محتوا در AI Overviews و AI Mode را هم می‌گیرد.",
        f: "اگر می‌خواهی صفحه در نتایج و پاسخ‌های هوش مصنوعی نقل شود، nosnippet را بردار یا max-snippet را روی ‎-1 بگذار." 
      },
      en: {
        t: "nosnippet or max-snippet:0 in the response header",
        d: "This strips the text snippet and, per Google's own robots-meta documentation, also stops the content being used as input for AI Overviews and AI Mode.",
        f: "Remove nosnippet, or set max-snippet:-1, if you want the page quoted in results and AI answers."
      }
    },
    HDR_EXPIRED: {
      fa: {
        t: "تاریخ unavailable_after گذشته است",
        d: "گوگل این صفحه را بعد از تاریخ اعلام‌شده از نتایج برمی‌دارد و آن تاریخ گذشته است.",
        f: "اگر صفحه هنوز معتبر است، دستور unavailable_after را از هدر بردار."
      },
      en: {
        t: "unavailable_after date is in the past",
        d: "Google drops the page from results after the declared date, and that date has already passed.",
        f: "Remove the unavailable_after directive if the page is still current."
      }
    },
    HDR_ROBOTS_OK: {
      fa: { t: "هدر X-Robots-Tag محدودیتی اعمال نمی‌کند", d: "", f: "" },
      en: { t: "X-Robots-Tag header imposes no restrictions", d: "", f: "" }
    },
    HDR_CANON_CONFLICT: {
      fa: {
        t: "‏canonical هدر با canonical داخل <head> فرق دارد",
        d: "وقتی دو canonical متفاوت اعلام شود، گوگل هر دو را نادیده می‌گیرد و خودش تصمیم می‌گیرد.",
        f: "یکی از این دو را حذف کن تا فقط یک آدرس canonical باقی بماند."
      },
      en: {
        t: "Link header canonical contradicts the one in <head>",
        d: "When two different canonicals are declared, Google ignores both and picks its own.",
        f: "Remove one of them so a single canonical URL remains."
      }
    },
    HDR_CANON_ONLY: {
      fa: {
        t: "‏canonical فقط در هدر HTTP اعلام شده",
        d: "معتبر است، ولی در سورس صفحه دیده نمی‌شود و به‌راحتی از قلم می‌افتد.",
        f: "برای شفافیت، همان آدرس را داخل <head> هم بگذار."
      },
      en: {
        t: "Canonical is declared only in the HTTP header",
        d: "Valid, but invisible in the page source and easy to lose track of.",
        f: "Mirror the same URL in <head> for clarity."
      }
    },

    /* --- Retired rich results --- */
    SD_RETIRED: {
      fa: {
        t: "‏{type} دیگر هیچ ریچ‌ریزالتی تولید نمی‌کند",
        d: "گوگل این نوع را در تاریخ {date} بازنشسته کرده است. اسکیما همچنان معتبر است و هر ولیدیتوری آن را «درست» اعلام می‌کند، ولی هیچ فیچری در نتایج جستجو نمی‌سازد.",
        f: "اگر فقط برای ریچ‌ریزالت گذاشته شده بود حذفش کن؛ اگر بخشی از گراف داده‌ات است نگهش دار ولی رویش حساب نکن."
      },
      en: {
        t: "{type} no longer produces any rich result",
        d: "Google retired this type on {date}. The schema is still valid and every validator will call it correct, but it earns no search feature at all.",
        f: "Remove it if it existed only for the rich result; keep it if it is part of your data graph, but do not expect a SERP feature."
      }
    },
    SD_DEPRECATED: {
      fa: {
        t: "ریچ‌ریزالت {type} حذف شده است",
        d: "گوگل نمایش این فیچر را از {date} متوقف کرده؛ خود نوع اسکیما همچنان معنا دارد.",
        f: "انتظار فیچر جستجو از آن نداشته باش و اگر بی‌استفاده است پاکش کن."
      },
      en: {
        t: "The {type} rich result has been removed",
        d: "Google stopped showing this feature as of {date}; the schema type itself still has meaning.",
        f: "Do not expect a search feature from it, and drop it if nothing else uses it."
      }
    },
    SD_SEARCHBOX: {
      fa: {
        t: "‏Sitelinks Searchbox منسوخ شده است",
        d: "‏SearchAction داخل WebSite از {date} دیگر جعبه جستجوی سایت‌لینک نمی‌سازد.",
        f: "می‌توانی این بلاک را حذف کنی؛ کاری انجام نمی‌دهد."
      },
      en: {
        t: "Sitelinks searchbox markup is deprecated",
        d: "The SearchAction inside WebSite stopped producing a sitelinks search box as of {date}.",
        f: "You can remove this block — it does nothing."
      }
    },
    SD_INVISIBLE: {
      fa: {
        t: "{n} مقدار در اسکیما که روی صفحه دیده نمی‌شود",
        d: "قیمت یا امتیازی که در JSON-LD اعلام شده در متن صفحه پیدا نشد. سیاست داده ساختاریافته گوگل مارک‌آپ محتوای نامرئی را ممنوع کرده و ناهمخوانی قیمت و امتیاز رایج‌ترین دلیل جریمه دستی است.",
        f: "همان مقدار را در متن صفحه نمایش بده، یا مقدار اسکیما را با چیزی که کاربر می‌بیند یکی کن."
      },
      en: {
        t: "Schema values that do not appear on the page ({n})",
        d: "A price or rating declared in JSON-LD was not found anywhere in the page text. Google's structured-data policy forbids marking up invisible content, and price/rating mismatches are the most common cause of manual actions.",
        f: "Show the same value in the visible content, or change the schema to match what the user sees."
      }
    }
  };

  // U+2068 FIRST STRONG ISOLATE … U+2069 POP DIRECTIONAL ISOLATE.
  // A raw value interpolated into a sentence — a schema type, a lang code, an element
  // name — carries its own direction. Without isolation, `lang="fa"` dropped into a
  // Persian sentence renders with the quote marks at the wrong end. These are the plain
  // text equivalent of <bdi>, so they survive textContent, innerHTML, the clipboard
  // report and the PDF alike. Pure numbers are left alone: the bidi algorithm already
  // handles digits correctly, and stray controls would show up in copied text.
  const FSI = "⁨", PDI = "⁩";
  function isolate(v) {
    const s = String(v);
    return /[^\d\s.,\/٫٬۰-۹٠-٩]/.test(s) ? FSI + s + PDI : s;
  }

  // Retirement dates arrive from the engine as language-neutral ISO strings and are
  // rendered here, so audit.js stays free of anything locale-shaped.
  function localDate(iso, lang) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ""));
    if (!m) return String(iso || "");
    try {
      return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])).toLocaleDateString(
        lang === "fa" ? "fa-IR" : "en-GB",
        { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" }
      );
    } catch (e) { return String(iso); }
  }

  function fill(str, params) {
    if (!str) return "";
    return str.replace(/\{(\w+)\}/g, (m, k) => (params && params[k] != null ? isolate(params[k]) : ""));
  }

  function ui(lang, key, params) {
    const pack = UI[lang] || UI.en;
    return fill(pack[key] != null ? pack[key] : (UI.en[key] || key), params);
  }

  function issue(lang, code, params) {
    const entry = M[code];
    if (!entry) return { t: code, d: "", f: "" };
    const p = entry[lang] || entry.en;
    let vals = params;
    if (params && params.date) vals = Object.assign({}, params, { date: localDate(params.date, lang) });
    return { t: fill(p.t, vals), d: fill(p.d, vals), f: fill(p.f, vals) };
  }

  window.__SEO_LENS_I18N__ = { UI, M, ui, issue, fill };
})();
