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

module.exports = { CLEAN, RTL_BROKEN, RTL_GOOD, SCHEMA, HEADERS, ASSETS, ROBOTS_TXT };
