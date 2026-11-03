async function deliverPendingCaptures() {
  try {
    const { captures = [] } = await chrome.runtime.sendMessage({ type: "list-captures" });
    for (const capture of captures) {
      window.postMessage({ source: "crunchless-extension", type: "capture", capture }, location.origin);
    }
  } catch { /* extension may be reloading */ }
}

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === "deliver-captures") deliverPendingCaptures();
});

window.addEventListener("message", (event) => {
  if (event.source !== window || event.origin !== location.origin || event.data?.source !== "crunchless-app") return;
  if (event.data.type === "capture-ack") chrome.runtime.sendMessage({ type: "ack-capture", id: event.data.id });
  if (event.data.type === "ready") deliverPendingCaptures();
});

deliverPendingCaptures();
