// src/scripts/utils.js
function sendPostMessage({ type, data }) {
  window.postMessage({ type, data }, "*");
}

// src/scripts/http/intercept_http.js
function captureXMLHttpRequest({ hasSensitiveKeysFn: hasSensitiveKeysFn2 }) {
  const XHR = XMLHttpRequest.prototype;
  const open = XHR.open;
  const send = XHR.send;
  const setRequestHeader = XHR.setRequestHeader;
  XHR.open = function(method, url) {
    this._method = method;
    this._url = url;
    this._requestHeaders = {};
    this._startTime = (/* @__PURE__ */ new Date()).toISOString();
    return open.apply(this, arguments);
  };
  XHR.setRequestHeader = function(header, value) {
    this._requestHeaders[header] = value;
    return setRequestHeader.apply(this, arguments);
  };
  XHR.send = function(postData) {
    this.addEventListener("load", () => {
      const endTime = (/* @__PURE__ */ new Date()).toISOString();
      const requestModel = {
        uri: decodeURIComponent(this._url),
        verb: this._method,
        time: this._startTime,
        headers: this._requestHeaders
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
      const responseModel = {
        status: this.status,
        time: endTime,
        headers: this.getAllResponseHeaders(),
        _priv: {
          is_json: false,
          sensitive: { is_sensitive: false, keywords_matched: [] }
        }
      };
      if (this.responseText) {
        try {
          responseModel.body = JSON.parse(this.responseText);
          responseModel._priv.is_json = true;
          responseModel._priv.sensitive = hasSensitiveKeysFn2(responseModel.body);
        } catch {
          responseModel.body = this.responseText;
        }
      }
      const data = {
        request: requestModel,
        response: responseModel || {}
      };
      sendPostMessage({ type: "XML_EVENT", data });
    });
    return send.apply(this, arguments);
  };
  const undoPatch = function() {
    XHR.open = open;
    XHR.send = send;
    XHR.setRequestHeader = setRequestHeader;
  };
  return undoPatch;
}
function captureFetchRequest() {
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    return originalFetch.apply(this, args).then((res) => {
      const responseClone = res.clone();
      const data = { request: args[0] || {}, response: {} };
      return responseClone.json().then((parsed) => {
        data.response = {
          ...parsed,
          _priv: {
            is_json: true,
            sensitive: hasSensitiveKeysFn(parsed)
          }
        };
        sendPostMessage({ type: "FETCH_EVENT", data });
        return res;
      }).catch(() => {
        const textResponseClone = res.clone();
        return textResponseClone.text().then((text) => {
          data.response = {
            body: text,
            _priv: {
              is_json: false,
              sensitive: { is_sensitive: false, keywords_matched: [] }
            }
          };
          sendPostMessage({ type: "FETCH_EVENT", data });
          return res;
        });
      });
    }).catch((error) => {
      throw error;
    });
  };
}

// src/scripts/http/analyze_http_body.js
var ROOT_SENSITIVE_KEYS = ["locked", "unlocked", "premium", "free", "pro", "subscribed"];
function analyzeJSONBody(body) {
  const keys = matchKeys(body, ROOT_SENSITIVE_KEYS);
  return { is_sensitive: !!keys.length, keywords_matched: keys };
}
function expandKeys(sensitiveKeys = []) {
  const capitalizeFirstLetter = (k) => k.charAt(0).toUpperCase() + k.slice(1);
  const ret = [];
  sensitiveKeys.forEach((key) => {
    const uppercaseKey = capitalizeFirstLetter(key.toString());
    ret.push(key, `is${uppercaseKey}`, `is_${key}`, `_${key}`);
  });
  return ret;
}
function matchRegex(sensitive_key, target) {
  if (sensitive_key.charAt(0) == "_") {
    const reg = new RegExp("^(.+)" + sensitive_key + "$");
    return !!target.match(reg);
  }
  return false;
}
function matchKeys(obj, sensitiveKeys = []) {
  function checkRecursively(obj2, keys2, visited2) {
    if (obj2 && typeof obj2 === "object") {
      if (visited2.has(obj2)) {
        return;
      }
      visited2.add(obj2);
      for (const key in obj2) {
        if (Object.prototype.hasOwnProperty.call(obj2, key)) {
          keys2.forEach((k) => {
            if ((k === key || matchRegex(k, key)) && !matchedKeys.includes(key)) {
              matchedKeys.push(key);
            }
          });
          const val = obj2[key];
          if (typeof val === "object" && val !== null) {
            checkRecursively(val, keys2, visited2);
          }
        }
      }
    }
  }
  const matchedKeys = [];
  const keys = expandKeys(sensitiveKeys);
  const visited = /* @__PURE__ */ new Set();
  checkRecursively(obj, keys, visited);
  return matchedKeys;
}

// src/scripts/http_main.js
interceptHTTPmessages();
function interceptHTTPmessages() {
  if (window.__injected) {
    return;
  }
  console.log("[EXT] XHL/fetch intercepted in:", window.location.href);
  window.__injected = true;
  captureXMLHttpRequest({ hasSensitiveKeysFn: analyzeJSONBody });
  captureFetchRequest();
}
