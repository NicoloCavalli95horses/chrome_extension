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
http_main();



//==============================
// Functions
//==============================
function http_main() {
  if (window.__injected) { return; } // prevent double injections
  console.log("[EXT] XHL/fetch intercepted in:", window.location.href);
  window.__injected = true;

  // Wrap HTTP requests and analyze their body
  captureXMLHttpRequest( {bodyAnalysisFn: analyzeJSONBody} );
  captureFetchRequest( {bodyAnalysisFn: analyzeJSONBody} );
}