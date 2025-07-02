//==============================
// Main
//==============================
chrome.webNavigation.onCompleted.addListener( async (details) => {
  try {
    const [tab] = await chrome.tabs.query( {active: true, currentWindow: true} );
    if (!tab || !tab.url || !/^https?:/.test(tab.url)) {
      return;
    }

    await chrome.scripting.executeScript({
      target: { tabId: details.tabId },
      files: ['http_main.js'],
      world: 'MAIN'
    });
  } catch (err) {
    return err;
  }
}, { url: [{ schemes: ['http', 'https'] }] });
