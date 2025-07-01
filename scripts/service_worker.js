//==============================
// Main
//==============================
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete' || !(/^https?:/.test(tab.url))) {
    // prevent access to chrome:// or file:/
    return;
  }
  // Execute interceptHTTP.js in the target website
  chrome.scripting.executeScript({
    target: { tabId },
    files: ['scripts/interceptHTTP.js'],
    world: 'MAIN'
  });
});