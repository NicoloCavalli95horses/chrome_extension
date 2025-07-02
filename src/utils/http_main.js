//==============================
// Import
//==============================



//==============================
// Globals
//==============================
const ROOT_SENSITIVE_KEYS = ['locked', 'unlocked', 'premium', 'free', 'pro', 'subscribed'];


//==============================
// Main
//==============================
interceptHTTPmessages();

// @TODO 
// 1- sometimes window.fetch and XMLHttpRequest are already wrapped by the target website (e.g., Duolingo)
//    We need a way to make sure that our wrapping is the latest
// 2- some JSON bodies are protected by anti-embedding tokens. This means that they are sensitivie



//==============================
// Functions
//==============================
function interceptHTTPmessages() {
  console.log("[EXT] XHL/fetch intercepted in:", window.location.href);
  window.__injected = true;
  captureXMLHttpRequest(XMLHttpRequest);
  captureFetchRequest(window.fetch);
}



/**
 * @param {Array} sensitiveKeys 
 * @returns expand keys
 */
function expandKeys(sensitiveKeys = []) {
  const capitalizeFirstLetter = (k) => k.charAt(0).toUpperCase() + k.slice(1);
  const ret = [];
  sensitiveKeys.forEach(key => {
    const uppercaseKey = capitalizeFirstLetter(key.toString());
    ret.push(key, `is${uppercaseKey}`, `is_${key}`, `_${key}`);
  });
  return ret;
}



/**
 * @param {String} sensitiveKeys 
 * @param {String} target 
 * @returns true if the target match a sensitive keys
 */
function matchRegex(sensitive_key, target) {
  if (sensitive_key.charAt(0) == '_') {
    const reg = new RegExp('^(.+)' + sensitive_key + '$');
    return !!target.match(reg);
  }
  return false;
}



/**
 * @param {Object} obj 
 * @param {Array} sensitiveKeys 
 * @returns true if sensitive keys is found
 */
function containsSensitiveKey(obj, sensitiveKeys = []) {
  function checkRecursively(obj, keys) {
    if (obj && typeof obj === 'object') {
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          const hasSensitiveKey = keys.some( k => key === k || matchRegex(k, key) );
          if (hasSensitiveKey) {
            return true;
          }

          const value = obj[key];
          if (typeof value === 'object' && value !== null) {
            if (checkRecursively(value, keys)) {
              return true;
            }
          }
        }
      }
    }
    return false;
  }

  const keys = expandKeys(sensitiveKeys);
  return checkRecursively(obj, keys);
}



/**
 * Send message to content_script
*/
function sendToContentScript( {type = 'SERVICE_WORKER', data} ) {
  window.postMessage( {type, data}, '*');
};



/**
 * Patching of native window.fetch function
*/
function captureFetchRequest(originalFetch) {
  window.fetch = function (...args) {
    return originalFetch.apply(this, args)
      .then(response => {
        const responseClone = response.clone();
        const data = { request: args[0] || {}, response: {} };

        // Send JSON if possible
        return responseClone.json()
          .then(parsed => {
            data.response = { ...parsed, is_json: true };
            sendToContentScript({ data });
            return response;
          })
          .catch(() => {
            return responseClone.text()
              .then(text => {
                data.response = text;
                sendToContentScript({ data });
                return response;
              });
          });
      })
      .catch(error => { throw error; });
  }
}



/**
* Patching of native XMLHttpRequest function
*/
function captureXMLHttpRequest(xhr) {
  const XHR = xhr.prototype;
  const open = XHR.open;
  const send = XHR.send;
  const setRequestHeader = XHR.setRequestHeader;

  XHR.open = function (method, url) {
    // To access URL search parameters easily, if required
    // const urlObj = new URLSearchParams(decodeURIComponent(url));
    this._method = method;
    this._url = url;
    this._requestHeaders = {};
    this._startTime = new Date().toISOString();
    return open.apply(this, arguments);
  };

  XHR.setRequestHeader = function (header, value) {
    this._requestHeaders[header] = value;
    return setRequestHeader.apply(this, arguments);
  };

  XHR.send = function (postData) {
    this.addEventListener("load", () => {
      const endTime = new Date().toISOString();
      const requestModel = {
        uri: decodeURIComponent(this._url),
        verb: this._method,
        time: this._startTime,
        headers: this._requestHeaders,
      };
      if (postData) {
        if (typeof postData === "string") {
          try {
            requestModel.body = JSON.parse(postData);
          } catch (error) {
            requestModel.body = postData;
          }
        } else if (typeof postData === "object" || Array.isArray(postData) || typeof postData === "number" || typeof postData === "boolean") {
          requestModel.body = postData;
        }
      }
      // Access headers
      const responseModel = {
        status: this.status,
        time: endTime,
        headers: this.getAllResponseHeaders(),
      };

      if (this.responseText) {
        try {
          responseModel.body = JSON.parse(this.responseText);
          if (containsSensitiveKey(responseModel.body, ROOT_SENSITIVE_KEYS)) {
            responseModel._SENSITIVE = true;
          }
        } catch {
          responseModel.body = this.responseText;
        }
      }
      const data = {
        request: requestModel,
        response: responseModel || {}
      };

      // console.log("Intercepted XHL => ", {request: requestModel || {}, response: responseModel || {}} );
      sendToContentScript({ data });
    })
    return send.apply(this, arguments);
  };

  const undoPatch = function () {
    XHR.open = open;
    XHR.send = send;
    XHR.setRequestHeader = setRequestHeader;
  };
  return undoPatch;
}