//==============================
// Import
//==============================
import { DOMManipulationCheck } from './scripts/utils.js';


//==============================
// Main
//==============================
DOMManipulationCheck();

window.addEventListener('message', (event) => {
  if (event.source === window && ['FETCH_EVENT', 'XML_EVENT'].includes(event.data.type)) {
    if (event.data.data?.response?._priv?.sensitive?.is_sensitive) {
      // log only likely sensitive HTTP responses
      console.log(event.data.data)
    }
  }
});


