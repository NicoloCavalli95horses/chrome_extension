//==============================
// Main
//==============================
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete' || !(/^https?:/.test(tab.url))) {
    // prevent access to chrome:// or file:/
    return;
  }
  // Execute http_main.js in the target website (bundled by esbuild)
  chrome.scripting.executeScript({
    target: { tabId },
    files: ['http_main.js'],
    world: 'MAIN'
  });
});