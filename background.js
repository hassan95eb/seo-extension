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
