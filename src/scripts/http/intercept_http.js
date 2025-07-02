//==============================
// Import
//==============================
import { sendPostMessage } from '../utils.js';



//==============================
// Functions
//==============================

/**
 * Patching of native XMLHttpRequest function
 * @param {Function} hasSensitiveKeysFn - function that analyze sensitive keys 
 * @returns
 */
export function captureXMLHttpRequest( {hasSensitiveKeysFn} ) {
  const XHR = XMLHttpRequest.prototype;
  const open = XHR.open;
  const send = XHR.send;
  const setRequestHeader = XHR.setRequestHeader;

  XHR.open = function (method, url) {
    // const urlObj = new URLSearchParams( decodeURIComponent(url) ); // to access URL search parameters easily, if required
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
        _priv: {
          is_json: false,
          sensitive: { is_sensitive: false, keywords_matched: [] }
        }
      };

      if (this.responseText) {
        try {
          responseModel.body = JSON.parse(this.responseText);
          responseModel._priv.is_json = true;
          responseModel._priv.sensitive = hasSensitiveKeysFn(responseModel.body);
        } catch {
          responseModel.body = this.responseText;
        }
      }
      const data = {
        request: requestModel,
        response: responseModel || {}
      };

      sendPostMessage( {type: 'XML_EVENT', data} );
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


/**
 * Patching of native window.fetch function
*/
export function captureFetchRequest() {
  const originalFetch = window.fetch;
  window.fetch = function (...args) {
    return originalFetch.apply(this, args)
      .then(res => {
        const responseClone = res.clone();
        const data = { request: args[0] || {}, response: {} };

        // Send JSON if possible
        return responseClone.json()
          .then(parsed => {
            data.response = {
              ...parsed,
              _priv: {
                is_json: true,
                sensitive: hasSensitiveKeysFn(parsed)
              },
            };
            sendPostMessage( {type: 'FETCH_EVENT', data} );
            return res;
          })
          .catch(() => {
            const textResponseClone = res.clone();
            return textResponseClone.text()
              .then(text => {
                data.response = {
                  body: text,
                  _priv: {
                    is_json: false,
                    sensitive: { is_sensitive: false, keywords_matched: [] }
                  }
                };
                sendPostMessage( {type: 'FETCH_EVENT', data} );
                return res;
              });
          });
      })
      .catch(error => { throw error; });
  }
}
