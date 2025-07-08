//==============================
// Import
//==============================
import {
  DOMManipulationCheck
} from './scripts/utils.js';



//==============================
// Main
//==============================
DOMManipulationCheck();

window.addEventListener('message', (event) => {
  if (event.source === window && ['FETCH_EVENT', 'XML_EVENT'].includes(event.data.type)) {

    const sensitive_req = event.data.data?.request?._priv?.is_sensitive;
    const sensitive_res = event.data.data?.response?._priv?.is_sensitive;
   
    if (sensitive_res || sensitive_req) {
      // log only likely sensitive HTTP responses
      console.log(event.data)
    }
  }
});
