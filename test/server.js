/* Local HTTPS server. location.protocol drives the HTTPS/mixed-content checks, so the
 * fixtures have to be served over TLS rather than from file://.
 */
const https = require("https");
const fs = require("fs");
const F = require("./fixtures");

const ROUTES = {
  "/clean.html": { body: F.CLEAN, headers: {} },
  "/rtl-broken.html": { body: F.RTL_BROKEN, headers: {} },
  "/rtl-good.html": { body: F.RTL_GOOD, headers: {} },
  "/schema.html": { body: F.SCHEMA, headers: {} },
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
  }
};

function start(cert, key, port) {
  const server = https.createServer({ cert, key }, (req, res) => {
    const path = req.url.split("?")[0];
    const route = ROUTES[path];
    if (!route) { res.writeHead(404); res.end("not found"); return; }
    res.writeHead(200, Object.assign(
      { "Content-Type": "text/html; charset=utf-8" }, route.headers
    ));
    res.end(req.method === "HEAD" ? "" : route.body);
  });
  return new Promise((r) => server.listen(port, () => r(server)));
}

module.exports = { start, ROUTES };

if (require.main === module) {
  start(fs.readFileSync("cert.pem"), fs.readFileSync("key.pem"), 8443)
    .then(() => console.log("listening on https://localhost:8443"));
}
