const APP_URLS = ["http://localhost:5173/*", "http://127.0.0.1:5173/*"];

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({ id: "save-to-crunchless", title: "Save selection to Crunchless", contexts: ["selection"] });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== "save-to-crunchless" || !info.selectionText?.trim()) return;
  const capture = {
    id: crypto.randomUUID(),
    title: String(info.selectionText).trim().replace(/\s+/g, " ").slice(0, 180),
    text: String(info.selectionText).trim().slice(0, 12000),
    url: info.pageUrl || tab?.url || "",
    pageTitle: tab?.title || "",
    capturedAt: new Date().toISOString(),
  };
  const { captures = [] } = await chrome.storage.local.get("captures");
  await chrome.storage.local.set({ captures: [capture, ...captures].slice(0, 100) });
  const tabs = await chrome.tabs.query({ url: APP_URLS });
  const appTab = tabs[0];
  if (appTab?.id) {
    await chrome.tabs.update(appTab.id, { active: true });
    try { await chrome.tabs.sendMessage(appTab.id, { type: "deliver-captures" }); } catch { /* the app bridge will read the outbox when it loads */ }
  } else {
    await chrome.tabs.create({ url: "http://localhost:5173/#capture-inbox", active: true });
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "list-captures") {
    chrome.storage.local.get("captures").then(({ captures = [] }) => sendResponse({ captures }));
    return true;
  }
  if (message?.type === "ack-capture" && message.id) {
    chrome.storage.local.get("captures").then(({ captures = [] }) => {
      chrome.storage.local.set({ captures: captures.filter((capture) => capture.id !== message.id) });
    });
  }
});
