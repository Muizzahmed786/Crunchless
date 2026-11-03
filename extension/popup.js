const status = document.querySelector("#status");
chrome.storage.local.get("captures").then(({ captures = [] }) => {
  status.textContent = captures.length ? `${captures.length} capture${captures.length === 1 ? "" : "s"} waiting for Crunchless.` : "No captures waiting.";
});
