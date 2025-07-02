//==============================
// Import
//==============================
import {
  captureFetchRequest,
  captureXMLHttpRequest,
} from './http/intercept_http.js';

import {
  analyzeJSONBody,
} from './http/analyze_http_body.js';



//==============================
// Main
//==============================
interceptHTTPmessages();



//==============================
// Functions
//==============================
function interceptHTTPmessages() {
  console.log("[EXT] XHL/fetch intercepted in:", window.location.href);
  window.__injected = true; // debug

  // Wrap HTTP requests and analyze their body
  captureXMLHttpRequest( {hasSensitiveKeysFn: analyzeJSONBody} );
  captureFetchRequest();
}


// TODO 
// 1- sometimes window.fetch and XMLHttpRequest are already wrapped by the target website (e.g., Duolingo)
//    We need a way to make sure that our wrapping is the latest
// 2- some JSON bodies are protected by anti-embedding tokens. This means that they are sensitivie