//==============================
// Import
//==============================
import { DOMManipulationCheck } from './utils/utils.js';


//==============================
// Main
//==============================
DOMManipulationCheck();

window.addEventListener('message', (event) => {
  if (event.source === window && event.data.type === 'SERVICE_WORKER') {
    if (event.data.data.response._SENSITIVE) {
      // Looking for sensitive object keys in HTTP responses
      console.log('Likely sensitive =>', event.data.data.response);
    }
  }
});


