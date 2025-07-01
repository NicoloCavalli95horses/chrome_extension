
// Inject script to wrap window.fetch (no need to do this)
// const script = document.createElement("script");
// script.src = chrome.runtime.getURL("scripts/inject.js");
// script.addEventListener("load", function () {
//     this.remove();
// });
// (document.head || document.documentElement).append(script);

// content.js
// alert('Hello, world!'); // this access the DOM of the target website
