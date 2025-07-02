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
  if (window.__injected) { return; } // prevent double injections
  console.log("[EXT] XHL/fetch intercepted in:", window.location.href);
  window.__injected = true;

  // Wrap HTTP requests and analyze their body
  captureXMLHttpRequest( {hasSensitiveKeysFn: analyzeJSONBody} );
  captureFetchRequest( {hasSensitiveKeysFn: analyzeJSONBody} );
}


// TODO 
// 1- sometimes window.fetch and XMLHttpRequest are already wrapped by the target website, we need a way to
//  make sure that our wrapping is the latest
// 2- some JSON bodies are protected by anti-embedding tokens. This means that they are sensitivie