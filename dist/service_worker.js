chrome.tabs.onUpdated.addListener((t,e,r)=>{e.status!=="complete"||!/^https?:/.test(r.url)||chrome.scripting.executeScript({target:{tabId:t},files:["http_main.js"],world:"MAIN"})});
