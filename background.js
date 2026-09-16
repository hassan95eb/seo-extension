/*  SEO Lens — SEO issues, highlighted on the page
 *  hassan mode : on
 *  https://github.com/hassan95eb/seo-extension
 */
// SEO Lens — service worker
// Toggles the audit panel in the active tab when the toolbar icon is clicked.
//
// The extension declares no content_scripts and no host_permissions. Nothing runs
// on any page until the user clicks the toolbar icon; that click grants activeTab
// for the current tab only, which is what makes the scripting call below legal.

// Hosts that block extension scripting outright, so we fail fast with a clear badge.
const BLOCKED_HOSTS = ["chromewebstore.google.com"];

function isInjectable(url) {
  if (!url) return false;
  try {
    const u = new URL(url);
    // Only ordinary web pages and local files can host the panel; everything else
    // (chrome:, chrome-extension:, edge:, about:, devtools:, view-source:, …) is out.
    if (u.protocol !== "http:" && u.protocol !== "https:" && u.protocol !== "file:") return false;
    if (BLOCKED_HOSTS.includes(u.hostname)) return false;
    if (u.hostname === "chrome.google.com" && u.pathname.startsWith("/webstore")) return false;
    return true;
  } catch (e) {
    return false;
  }
}

async function ensureInjected(tabId) {
  try {
    // Already injected in this tab from an earlier click? Then just reuse it.
    await chrome.tabs.sendMessage(tabId, { type: "SEO_LENS_PING" });
    return true;
  } catch (e) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ["i18n.js", "audit.js", "content.js"]
      });
      return true;
    } catch (err) {
      // Typically a file:// page without "Allow access to file URLs", or a page
      // the browser refuses to script at all.
      console.warn("SEO Lens: injection failed", err);
      return false;
    }
  }
}

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab || !tab.id) return;
  if (!isInjectable(tab.url)) {
    chrome.action.setBadgeText({ tabId: tab.id, text: "×" });
    chrome.action.setBadgeBackgroundColor({ tabId: tab.id, color: "#b91c1c" });
    return;
  }
  const ok = await ensureInjected(tab.id);
  if (!ok) return;
  try {
    await chrome.tabs.sendMessage(tab.id, { type: "SEO_LENS_TOGGLE" });
  } catch (e) {
    console.warn("SEO Lens:", e);
  }
});

// Issue-count badge on the toolbar icon + opening the report page
chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg && msg.type === "SEO_LENS_OPEN_REPORT") {
    const url = chrome.runtime.getURL("report.html") + "?k=" + encodeURIComponent(msg.key || "seoLensReport");
    chrome.tabs.create({ url, index: sender.tab ? sender.tab.index + 1 : undefined });
    return;
  }
  if (msg && msg.type === "SEO_LENS_SCORE" && sender.tab && sender.tab.id) {
    const errors = msg.errors || 0;
    const warnings = msg.warnings || 0;
    const total = errors + warnings;
    chrome.action.setBadgeText({
      tabId: sender.tab.id,
      text: total ? String(total > 99 ? "99+" : total) : ""
    });
    chrome.action.setBadgeBackgroundColor({
      tabId: sender.tab.id,
      color: errors > 0 ? "#dc2626" : warnings > 0 ? "#d97706" : "#16a34a"
    });
  }
});

/* ---------- Optimize — item 8 phase P1 ----------
 * Why this lives here rather than in the content script: the original plan called for a
 * dedicated Worker so encoding never touches the page's main thread, but a content script
 * spinning up `new Worker(blobURL)` is subject to the AUDITED PAGE's CSP (worker-src /
 * child-src) and fails silently on exactly the well-configured sites most likely to be
 * audited. The service worker has no page CSP, already has OffscreenCanvas and
 * createImageBitmap, and keeps the audited page untouched either way (hard rule 6).
 *
 * The image crosses into this context as base64, not as a Blob or ArrayBuffer. Both were
 * tried first: chrome.runtime.sendMessage does not structured-clone either one between a
 * content script and a service worker — they arrive JSON-flattened into `{}` — so the
 * only payload shape that survives the trip intact is a plain string.
 */
function b64ToBlob(b64, mime) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime || "application/octet-stream" });
}

function blobToB64(blob) {
  return blob.arrayBuffer().then((ab) => {
    const bytes = new Uint8Array(ab);
    let s = "";
    // String.fromCharCode.apply chokes on very large arrays passed in one call;
    // chunking keeps this working for images well past what this feature targets.
    const CHUNK = 0x8000;
    for (let i = 0; i < bytes.length; i += CHUNK) {
      s += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
    }
    return btoa(s);
  });
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || msg.type !== "SEO_LENS_OPTIMIZE") return;
  (async () => {
    try {
      const srcBlob = b64ToBlob(msg.b64, msg.mime);
      const beforeBytes = srcBlob.size;
      const bitmap = await createImageBitmap(srcBlob);
      // The rendered width the audit already measured, never the natural size — 8d's
      // whole point is serving the image at the size it is actually displayed at.
      // Height follows the bitmap's own aspect ratio rather than a second measurement,
      // so a mismatched width/height pair on the page cannot distort the output.
      const width = Math.max(1, Math.round(msg.width || bitmap.width));
      const height = Math.max(1, Math.round(width * bitmap.height / bitmap.width));
      const canvas = new OffscreenCanvas(width, height);
      canvas.getContext("2d").drawImage(bitmap, 0, 0, width, height);
      const outBlob = await canvas.convertToBlob({ type: "image/webp", quality: 0.82 });
      const outB64 = await blobToB64(outBlob);
      sendResponse({ ok: true, beforeBytes, afterBytes: outBlob.size, mime: "image/webp", b64: outB64 });
    } catch (e) {
      sendResponse({ ok: false, error: String((e && e.message) || e) });
    }
  })();
  return true; // keep the message channel open for the async sendResponse above
});
