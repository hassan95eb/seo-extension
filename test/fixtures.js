/* Fixture pages for the SEO Lens verification run.
 * Each one is deliberately minimal and targets a specific set of codes.
 */

// A page that must score exactly 100: nothing wrong, nothing informational.
const CLEAN = `<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>A perfectly ordinary page about garden hoses and watering</title>
<meta name="description" content="What to know when choosing a garden hose: bore diameter, burst pressure, fittings, storage reels and the winter care that makes a hose last.">
<link rel="canonical" href="https://localhost:8443/clean.html">
<link rel="icon" href="/favicon.ico">
<meta property="og:title" content="A perfectly ordinary page about garden hoses">
<meta property="og:description" content="Choosing, using and storing a garden hose.">
<meta property="og:image" content="https://localhost:8443/og.png">
<meta name="twitter:card" content="summary_large_image">
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"Article","headline":"Garden hoses","author":{"@type":"Person","name":"Someone"}}
</script>
</head>
<body>
<h1>Choosing a garden hose</h1>
<p>${"A garden hose is a flexible tube used to convey water from a tap to a point of use. ".repeat(12)}</p>
<h2>Bore and pressure</h2>
<p>${"Bore diameter sets the flow rate, while burst pressure sets how hard you can push it. ".repeat(12)}</p>
<h2>Storage</h2>
<p>${"A reel keeps the hose off the ground and stops kinks forming over the winter months. ".repeat(12)}</p>
<a href="/fittings.html">Read the fittings guide</a>
<a href="/reels.html">Compare storage reels</a>
</body>
</html>`;

// Persian page with every direction defect the new checks look for.
const RTL_BROKEN = `<!DOCTYPE html>
<html lang="fa" dir="ltr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>راهنمای کامل خرید و مقایسه گوشی‌های هوشمند در سال ۱۴۰۵ به همراه بررسی قیمت و مشخصات فنی هر مدل</title>
<meta name="description" content="یک توضیح کوتاه.">
<link rel="canonical" href="https://localhost:8443/rtl-broken.html">
</head>
<body>
<h1>مقایسه iPhone 15 Pro با Galaxy S24 Ultra</h1>
<p>${"در این مطلب به بررسی دقیق مشخصات فنی و قیمت این دو گوشی می‌پردازیم و تفاوت‌های آن‌ها را مرور می‌کنیم. ".repeat(10)}</p>
<a href="/models.html">مشاهده همه مدل‌های Samsung Galaxy</a>
</body>
</html>`;

// Persian page that declares direction correctly and isolates its Latin runs.
const RTL_GOOD = `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>مقایسه گوشی‌های پرچمدار امسال</title>
<meta name="description" content="بررسی مشخصات فنی، قیمت و تفاوت‌های اصلی گوشی‌های پرچمدار امسال، به همراه راهنمای انتخاب بر اساس بودجه و نیاز روزمره کاربران ایرانی.">
<link rel="canonical" href="https://localhost:8443/rtl-good.html">
<link rel="icon" href="/favicon.ico">
<meta property="og:title" content="مقایسه گوشی‌های پرچمدار">
<meta property="og:description" content="بررسی مشخصات و قیمت.">
<meta property="og:image" content="https://localhost:8443/og.png">
<meta name="twitter:card" content="summary_large_image">
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"Article","headline":"مقایسه گوشی‌ها"}
</script>
</head>
<body>
<h1>مقایسه گوشی‌های پرچمدار</h1>
<p>${"در این مطلب به بررسی دقیق مشخصات فنی و قیمت گوشی‌های پرچمدار می‌پردازیم و تفاوت‌های آن‌ها را مرور می‌کنیم. ".repeat(12)}</p>
<h2>جمع‌بندی</h2>
<p>${"انتخاب نهایی به بودجه و نیاز روزمره شما بستگی دارد و هیچ گزینه‌ای برای همه بهترین نیست. ".repeat(12)}</p>
<a href="/models.html">مشاهده مدل <bdi>Galaxy S24</bdi></a>
<a href="/prices.html">قیمت‌ها</a>
</body>
</html>`;

// Retired schema types plus a price that appears nowhere on the page.
const SCHEMA = `<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Frequently asked questions about our subscription plans</title>
<meta name="description" content="Answers to the questions we get asked most often about billing, cancellation, refunds and how the trial period works on each of our subscription plans.">
<link rel="canonical" href="https://localhost:8443/schema.html">
<script type="application/ld+json">
{"@context":"https://schema.org","@graph":[
 {"@type":"FAQPage","mainEntity":[{"@type":"Question","name":"Can I cancel?"}]},
 {"@type":"HowTo","name":"How to cancel"},
 {"@type":"WebSite","url":"https://localhost:8443/","potentialAction":{"@type":"SearchAction","target":"https://localhost:8443/?q={q}"}},
 {"@type":"Product","name":"Pro plan","offers":{"@type":"Offer","price":"499.00","priceCurrency":"USD"},
  "aggregateRating":{"@type":"AggregateRating","ratingValue":"4.8","reviewCount":"120"}}
]}
</script>
</head>
<body>
<h1>Frequently asked questions</h1>
<p>${"Our billing runs monthly and you can cancel at any point before the renewal date. ".repeat(12)}</p>
<p>The Pro plan costs 129 dollars a month and is rated 4.8 by our customers.</p>
<a href="/plans.html">See all plans</a>
</body>
</html>`;

// Same content, served with a hostile set of response headers.
const HEADERS = `<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>A page that looks completely fine in the DOM but is not</title>
<meta name="description" content="Nothing in this document says noindex, and yet the page will never appear in Google, because the directive arrives in an HTTP response header instead.">
<link rel="canonical" href="https://localhost:8443/headers.html">
</head>
<body>
<h1>Looks fine, is not</h1>
<p>${"There is nothing wrong with this markup at all, which is exactly the problem. ".repeat(12)}</p>
<a href="/next.html">Next page</a>
</body>
</html>`;

// A client-rendered shell. The browser sees a complete page after the inline script runs,
// while a crawler that consumes only the response HTML sees almost none of it — plus a
// noindex that the script dangerously removes.
const RAW_JS_ONLY = `<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Loading application</title>
<meta name="robots" content="noindex">
</head>
<body>
<div id="app">Loading</div>
<script>
document.title = "A fully rendered guide to client-side search visibility";
document.querySelector('meta[name="robots"]').remove();
document.head.insertAdjacentHTML("beforeend", '<link rel="canonical" href="https://localhost:8443/raw-js-only.html"><script type="application/ld+json">{"@context":"https://schema.org","@type":"Article","headline":"Client-side visibility"}<\\/script>');
document.getElementById("app").innerHTML = '<h1>Client-side search visibility</h1><p>${"This primary article content exists only after JavaScript executes in the browser. ".repeat(35)}</p><h2>What AI crawlers receive</h2><p>${"Crawlers that do not render scripts receive the empty application shell instead. ".repeat(20)}</p><a href="/guide.html">Read the server rendering guide</a>';
</script>
</body>
</html>`;

// A partially server-rendered page also exercises metadata differences that are less
// catastrophic than the empty shell above: missing raw title, changed canonical, and a
// robots directive added by JavaScript.
const RAW_PARTIAL = `<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title></title>
<link rel="canonical" href="https://localhost:8443/old-partial.html">
</head>
<body>
<h1>A partly server-rendered article</h1>
<p>${"This useful sentence is already available in the initial server response for every crawler. ".repeat(30)}</p>
<h2>Server-rendered section</h2>
<div id="more"></div>
<script>
document.title = "A partly server-rendered article with client metadata";
document.querySelector('link[rel="canonical"]').href = "https://localhost:8443/raw-partial.html";
document.head.insertAdjacentHTML("beforeend", '<meta name="robots" content="index, follow">');
document.getElementById("more").innerHTML = '<p>${"This different sentence is available only after the browser executes the application JavaScript. ".repeat(10)}</p>';
</script>
</body>
</html>`;

const RAW_ROBOTS_REMOVED = `<!DOCTYPE html>
<html lang="en" dir="ltr"><head>
<meta charset="utf-8"><title>Robots directives removed by client JavaScript</title>
<meta name="robots" content="nofollow">
<link rel="canonical" href="https://localhost:8443/raw-robots-removed.html">
</head><body><h1>Robots directive removal</h1>
<p>${"The complete article is present in the server response and remains unchanged after rendering. ".repeat(15)}</p>
<script>document.querySelector('meta[name="robots"]').remove();</script>
</body></html>`;

const RAW_ROBOTS_CHANGED = `<!DOCTYPE html>
<html lang="en" dir="ltr"><head>
<meta charset="utf-8"><title>Robots directives changed by client JavaScript</title>
<meta name="robots" content="nofollow">
<link rel="canonical" href="https://localhost:8443/raw-robots-changed.html">
</head><body><h1>Robots directive replacement</h1>
<p>${"The complete article is present in the server response and remains unchanged after rendering. ".repeat(15)}</p>
<script>document.querySelector('meta[name="robots"]').content = "noarchive";</script>
</body></html>`;

// Images and links with enough variety to exercise the inventory tables behind the CSV
// export: alt present/absent, a real decoded image, an external link, a nofollow, and a
// value that a spreadsheet would execute if the export did not neutralise it.
const PX =
  "data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==";

const ASSETS = `<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>A gallery page with images and links to export</title>
<meta name="description" content="This fixture exists to give the image and link inventories something to describe: images with and without alt text, internal and external links, and a nofollow.">
<link rel="canonical" href="https://localhost:8443/assets.html">
</head>
<body>
<h1>Gallery</h1>
<p>${"Some prose so the page is not flagged as thin content while the export is tested. ".repeat(12)}</p>
<img src="${PX}" alt="=SUM(A1:A9) a caption that a spreadsheet would run as a formula" width="120" height="80">
<img src="${PX}" width="40" height="40">
<img src="${PX}" alt="" loading="lazy" width="60" height="60">
<a href="/internal.html">An internal link</a>
<a href="https://example.com/out" target="_blank" rel="noopener">An external link</a>
<a href="/sponsored.html" rel="nofollow">A nofollow internal link</a>
</body>
</html>`;

// One robots.txt for the whole fixture origin, so every rule is path-scoped: clean.html
// has to stay genuinely unblocked (it is the page that must score 100) while the AI
// matrix, the `*` fallback, wildcards, the `$` anchor, multi-agent groups and an Allow
// that overrides a longer folder Disallow all still get exercised.
const ROBOTS_TXT = `# SEO Lens verification fixture
User-agent: *
Disallow: /private/
Allow: /private/public.html

User-agent: OAI-SearchBot
User-agent: Claude-SearchBot
Disallow: /ai-blocked.html

User-agent: GPTBot
Disallow: /ai-*

User-agent: Google-Extended
Disallow: /ai-blocked.html$

Sitemap: https://localhost:8443/sitemap.xml
Crawl-delay: 5
`;

/* ---------- real image bytes, for the LCP pass ----------
 * LCP cannot be exercised with the 1×1 data URI above: Chrome drops low-entropy images as
 * LCP candidates, so a solid-colour placeholder is never reported as the largest paint
 * however large it is displayed. These are deterministic noise PNGs — incompressible on
 * purpose, so the entropy filter keeps them — written here rather than committed as binary
 * fixtures, which keeps the repo free of 1.4 MB of test assets.
 */
const zlib = require("zlib");

const CRC = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return (buf) => {
    let c = -1;
    for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    return (c ^ -1) >>> 0;
  };
})();

function pngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, "latin1"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(CRC(body), 0);
  return Buffer.concat([len, body, crc]);
}

function noisePng(width, height) {
  const stride = width * 3 + 1;
  const raw = Buffer.alloc(stride * height);
  let seed = 20260915;
  for (let y = 0; y < height; y++) {
    let p = y * stride;
    raw[p++] = 0; // filter: none
    for (let x = 0; x < width * 3; x++) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      raw[p++] = (seed >> 16) & 0xff;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // truecolour
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", zlib.deflateSync(raw, { level: 1 })),
    pngChunk("IEND", Buffer.alloc(0))
  ]);
}

const HERO_PNG = noisePng(800, 600);   // displayed at 640×480 — the LCP element
const THUMB_PNG = noisePng(600, 450);  // displayed at 200×150 — overscaled on any screen
const TWOX_PNG = noisePng(400, 300);   // displayed at 200×150 — correct on a 2× screen only
const LOGO_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160">' +
  '<rect width="160" height="160" fill="#0e7490"/></svg>';

/* The image fixture: one clear LCP candidate that is also lazy-loaded and unprioritised,
 * a second lazy above-the-fold image that must survive the LCP de-duplication, a 2× asset
 * that is only overscaled on a 1× screen, and a vector that must not be accused of using
 * a legacy format. The row is a flex line so every image stays inside the first viewport
 * regardless of wrapping, and the prose is width-capped so it cannot out-paint the hero.
 */
const IMAGES = `<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>A gallery page whose hero image is the largest paint</title>
<meta name="description" content="This fixture exists so the LCP pass has something to find: a hero image large enough to be the largest paint, lazy-loaded, and served in a legacy format without a srcset.">
<link rel="canonical" href="https://localhost:8443/images.html">
</head>
<body>
<h1>Gallery</h1>
<div style="display:flex;gap:8px;align-items:flex-start">
<img id="hero" src="/hero.png" alt="A wide photograph of the workshop" width="640" height="480" loading="lazy">
<img id="thumb" src="/thumb.png" alt="A thumbnail of the same workshop" width="200" height="150" loading="lazy">
<img id="twox" src="/twox.png" alt="A double-density thumbnail" width="200" height="150">
<img id="vector" src="/logo.svg" alt="The workshop logo" width="160" height="160">
</div>
<p style="max-width:520px">${"The gallery above is the whole point of this page, which is exactly the situation the LCP pass is for. ".repeat(10)}</p>
</body>
</html>`;

module.exports = {
  CLEAN, RTL_BROKEN, RTL_GOOD, SCHEMA, HEADERS, RAW_JS_ONLY, RAW_PARTIAL,
  RAW_ROBOTS_REMOVED, RAW_ROBOTS_CHANGED, ASSETS, ROBOTS_TXT,
  IMAGES, HERO_PNG, THUMB_PNG, TWOX_PNG, LOGO_SVG
};
