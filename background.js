/*  SEO Lens — SEO issues, highlighted on the page
 *  hassan mode : on
 *  https://github.com/hassan95eb/seo-extension
 */
// SEO Lens — service worker
// Toggles the audit panel in the active tab when the toolbar icon is clicked.

const BAD_SCHEMES = ["chrome:", "chrome-extension:", "edge:", "about:", "devtools:", "view-source:"];

function isInjectable(url) {
  if (!url) return false;
  try {
    const u = new URL(url);
    if (BAD_SCHEMES.some((s) => u.protocol === s)) return false;
    if (u.hostname === "chromewebstore.google.com") return false;
    return u.protocol === "http:" || u.protocol === "https:" || u.protocol === "file:";
  } catch (e) {
    return false;
  }
}

async function ensureInjected(tabId) {
  try {
    await chrome.tabs.sendMessage(tabId, { type: "SEO_LENS_PING" });
    return true;
  } catch (e) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ["audit.js", "content.js"]
      });
      return true;
    } catch (err) {
      console.warn("SEO Lens: تزریق ناموفق", err);
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

// Issue-count badge on the toolbar icon
chrome.runtime.onMessage.addListener((msg, sender) => {
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
