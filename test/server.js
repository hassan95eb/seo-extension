/* Local HTTPS server. location.protocol drives the HTTPS/mixed-content checks, so the
 * fixtures have to be served over TLS rather than from file://.
 *
 * robots.txt lives at the origin, not next to the page, so the AI-crawler fixture is
 * path-scoped: one robots.txt whose rules single out /ai-blocked.html and /private/,
 * which keeps clean.html genuinely unblocked and still exercises every branch. The
 * two degenerate cases a single origin cannot express — robots.txt answering with HTML,
 * and robots.txt answering 5xx — get their own tiny servers on their own ports.
 */
const https = require("https");
const fs = require("fs");
const F = require("./fixtures");

const TEXT = "text/plain; charset=utf-8";
const HTML = "text/html; charset=utf-8";

const ROUTES = {
  "/clean.html": { body: F.CLEAN, headers: {} },
  "/rtl-broken.html": { body: F.RTL_BROKEN, headers: {} },
  "/rtl-good.html": { body: F.RTL_GOOD, headers: {} },
  "/schema.html": { body: F.SCHEMA, headers: {} },
  "/assets.html": { body: F.ASSETS, headers: {} },
  "/headers.html": {
    body: F.HEADERS,
    headers: {
      "X-Robots-Tag": "noindex, nosnippet, unavailable_after: 2025-01-01T00:00:00Z",
      Link: '<https://localhost:8443/somewhere-else.html>; rel="canonical"'
    }
  },
  // Same headers, but scoped to a bot we do not report on: must produce nothing.
  "/headers-otherbot.html": {
    body: F.HEADERS,
    headers: { "X-Robots-Tag": "bingbot: noindex" }
  },
  // A benign header, to prove the pass path works.
  "/headers-ok.html": {
    body: F.HEADERS,
    headers: { "X-Robots-Tag": "max-snippet:-1, max-image-preview:large" }
  },
  "/robots.txt": { body: F.ROBOTS_TXT, headers: {}, type: TEXT },
  // Disallowed for the AI agents named in robots.txt, allowed for everyone else.
  "/ai-blocked.html": { body: F.HEADERS, headers: {} },
  // Disallowed for `*`, which is what Googlebot and PerplexityBot fall back to.
  "/private/page.html": { body: F.HEADERS, headers: {} },
  // Same folder, rescued by a longer Allow rule.
  "/private/public.html": { body: F.HEADERS, headers: {} }
};

// robots.txt served as the site's HTML shell — the SPA catch-all mistake.
const HTML_ROBOTS_ROUTES = {
  "/robots.txt": { body: F.CLEAN, headers: {}, type: HTML },
  "/page.html": { body: F.HEADERS, headers: {} }
};

// robots.txt erroring, which crawlers read as a full disallow for the whole host.
const ERR_ROBOTS_ROUTES = {
  "/robots.txt": { body: "upstream failed", headers: {}, type: TEXT, status: 503 },
  "/page.html": { body: F.HEADERS, headers: {} }
};

function start(cert, key, port, routes) {
  const table = routes || ROUTES;
  const server = https.createServer({ cert, key }, (req, res) => {
    const path = req.url.split("?")[0];
    const route = table[path];
    if (!route) { res.writeHead(404); res.end("not found"); return; }
    res.writeHead(route.status || 200, Object.assign(
      { "Content-Type": route.type || HTML }, route.headers
    ));
    res.end(req.method === "HEAD" ? "" : route.body);
  });
  return new Promise((r) => server.listen(port, () => r(server)));
}

module.exports = { start, ROUTES, HTML_ROBOTS_ROUTES, ERR_ROBOTS_ROUTES };

if (require.main === module) {
  const cert = fs.readFileSync("cert.pem"), key = fs.readFileSync("key.pem");
  Promise.all([
    start(cert, key, 8443),
    start(cert, key, 8444, HTML_ROBOTS_ROUTES),
    start(cert, key, 8445, ERR_ROBOTS_ROUTES)
  ]).then(() => console.log("listening on https://localhost:8443 (+8444, +8445)"));
}
