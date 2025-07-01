chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete' || !(/^https?:/.test(tab.url))) {
    // prevent access to chrome:// or file:/
    return;
  }

  chrome.scripting.executeScript({
    target: { tabId },
    world: 'MAIN',
    func: () => {
      console.log("[EXT] XHL/fetch intercepted in:", window.location.href);
      window.__injected = true;

      /**
       * Patching of native window.fetch function
       */
      function captureFetchRequest(fetch) {
        const originalFetch = fetch;
        fetch = function () {
          originalFetch.apply(this, arguments).then(response => {
            response.clone().json()
            .then(parsed => {
                console.log('Intercepted fetch (JSON) => ', parsed);
                resolve(response);
              })
              .catch(err => {
                console.warn("Non-JSON response, returning original:", response);
                resolve(response);
              });
            })
            .catch(error => {
              reject(error);
            });
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
          const urlObj = new URLSearchParams(decodeURIComponent(url));
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
              } else if (
                typeof postData === "object" ||
                Array.isArray(postData) ||
                typeof postData === "number" ||
                typeof postData === "boolean"
              ) {
                requestModel.body = postData;
              }
            }
            // Access headers
            const responseHeaders = this.getAllResponseHeaders();
            const responseModel = {
              status: this.status,
              time: endTime,
              headers: responseHeaders,
            };

            if (this.responseText) {
              try {
                responseModel.body = JSON.parse(this.responseText);
              } catch {
                responseModel.body = this.responseText;
              }
            }
            console.log("Intercepted XHL => ", {request: requestModel || {}, response: responseModel || {}} );
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

      captureXMLHttpRequest(XMLHttpRequest);
      captureFetchRequest(window.fetch);
    }
  });
});

// TODO: sometimes window.fetch and XMLHttpRequest are already wrapped by the target website
// We need a way to make sure that our wrapping is the latest