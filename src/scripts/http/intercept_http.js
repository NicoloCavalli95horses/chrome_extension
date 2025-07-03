//==============================
// Import
//==============================
import { sendPostMessage } from '../utils.js';



//==============================
// Functions
//==============================

/**
 * Patching of native XMLHttpRequest function
 * @param {Function} bodyAnalysisFn - Function that analyze sensitive keys 
 * @returns
 */
export function captureXMLHttpRequest( {bodyAnalysisFn} ) {
  const XHR = XMLHttpRequest.prototype;
  const open = XHR.open;
  const send = XHR.send;
  const setRequestHeader = XHR.setRequestHeader;

  // Override open to capture method and URL
  XHR.open = function (method, url) {
    this._method = method;
    this._url = url;
    this._requestHeaders = {};
    return open.apply(this, arguments);
  };

  // Override setRequestHeader to capture headers
  XHR.setRequestHeader = function (header, value) {
    this._requestHeaders[header] = value;
    return setRequestHeader.apply(this, arguments);
  };

  // Centralized function to build request object
  const buildRequest = function (data) {
    return {
      uri: decodeURIComponent(this._url),
      verb: this._method,
      headers: this._requestHeaders,
      body: getRequestBody(data),
    };
  };

  // Override send to handle response and errors
  XHR.send = function (data) {
    const handleResponse = (_) => {
      const request = buildRequest.call(this, data); // Use the centralized request builder

      const response = {
        status: this.status,
        headers: this.getAllResponseHeaders(),
        ...getXHResponseBody( {data: this.responseText, func: bodyAnalysisFn} ),
      };

      // Send post message to `content_script.js`
      sendPostMessage( {type: 'XML_EVENT', data: {request, response} });
    };

    this.addEventListener('load', handleResponse); // successful response
    this.addEventListener('error', handleResponse); // error
    this.addEventListener('timeout', handleResponse); // timeout

    return send.apply(this, arguments);
  };
}



/**
 * @param {ReadableStream} data - The XMLHttpRequest response body
 * @param {Function} func - Function that parses JSON data
 * @returns {Object} The parsed data
 */
function getXHResponseBody( {data, func} ) {
  const ret = {
    body: data || {},
    _priv: {is_json: false, is_sensitive: false, keywords_matched: []}
  };

  if (!data) { ret; } 
  if (["object", "number", "boolean"].includes(typeof data) || Array.isArray(data)) { return ret; } 
   
  if (["string"].includes(typeof data)) {
    try {
      const body = JSON.parse(data);
      return {body, _priv: {...func(body), is_json: true}};
    } catch {
      return ret;
    }
  }
  return ret;
}



/**
 * @param {ReadableStream} data - The raw response body
 * @returns {Object} The parsed data
 */
function getRequestBody(data) {
  if (!data) { return; } 
  if (["object", "number", "boolean"].includes(typeof data) || Array.isArray(data)) { return data; } 
  if (["string"].includes(typeof data)) {
    try {
      return JSON.parse(data);
    } catch {
      return data;
    }
  }
}


/**
 * Patching of native window.fetch function
 * Compared to XMLHttpRequest, fetch API exposes data asynchronously since it is based on promises
 * @param {Function} bodyAnalysisFn - function that analyze sensitive keys 
 * @returns
 */
export async function captureFetchRequest( {bodyAnalysisFn} ) {
  const originalFetch = window.fetch;

  window.fetch = async function (...args) {
    try {
      const res = await originalFetch.apply(this, args);
      const _res = res.clone();

      const request = {
        uri: decodeURIComponent(args[0]),
        verb: args[1]?.method,
        headers: args[1]?.headers,
        body: getRequestBody( args[1]?.body ),
      };

      const response = {
        status: _res?.status,
        ...await getFetchResponseHeaders(_res?.headers),
        ...await getFetchResponseBody( {data: _res, func: bodyAnalysisFn} )
      };

      sendPostMessage( {type: 'FETCH_EVENT', data: {request, response}} );
      return res;

    } catch (error) {
      throw error;
    }
  }
}



/**
 * @param {Object} data 
 * @returns response headers object
 */
async function getFetchResponseHeaders(data) {
  const ret = {};
  data.forEach((value, name) => ret[name] = value);
  return ret;
}



/**
 * @param {ReadableStream} data - The raw response body from fetch API
 * @param {Function} func - A function that parses JSON data and returns additional metadata
 * @returns {Object} The parsed body of the response, along with private metadata about the body
 */
async function getFetchResponseBody( {data, func} ) {
  const ret = {
    body: {},
    _priv: {
      is_json: false,
      is_sensitive: false,
      keywords_matched: []
    },
  };

  try {
    const jsonResponse = await data.json().catch(() => null);
    if (jsonResponse) {
      ret.body = jsonResponse;
      ret._priv = { is_json: true, ...func(jsonResponse) };
    } else {
      const textResponse = await data.text();
      ret.body = textResponse;
    };
  } catch (err) {
    return ret
  }
  return ret;
}


/**
 * This function tries to detect if an HTTP body contains JSON,
 * bypassing common JSON hijacking prevention tokens, e.g., "])}while(1);</x>//{"test":true}
 * @param {String} data - string to parse
 * @return JSON object or error
 */
function fineParsingJSON(data) {
  if (typeof data !== 'string') {
    return new Error();
  }

  const parsed = [];
  const thr = Math.min(data.length, 80); // to check
  let index = -1;
  let is_valid = false;
  let slice_idx = -1;

  for (i = 0; i < thr; i++) {
    const char = data[i];

    // Search the first `{` available
    if (!parsed.length && char === '{') {
      parsed.push(char);
      index = i;
      slice_idx = i;
      continue;
    }

    // if `{` exist, the following char must be `"`
    if (parsed.length == 1 && i == (index + 1) && char === '"') {
      parsed.push(char);
      index = i;
      continue;
    }

    // if `{"` exist, check that the following char is eligible
    if (parsed.length == 2 && i == (index + 1) && char !== '"') {
      parsed.push(char);
      index = i;
      continue;
    }

    // if `{"a` exist, next must be another char or a `:` but not a `"`
    if (parsed.length > 2 && char !== '"') {
      parsed.push(char);
      index = i;
    }

    // there should be a `:` after idx 4
    if (parsed.length > 4 && parsed.includes(':') && !parsed.slice(0, 4).includes(':')) {
      is_valid = true;
    }
  }

  return is_valid ? JSON.parse(data) : new Error();
}