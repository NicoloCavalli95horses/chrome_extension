//==============================
// Import
//==============================
import {
  sendPostMessage,
  bypassAntiEmbeddingTokens,
} from '../utils.js';



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

  if (!data) { return ret; } 
  const type = typeof data;
  if (["object", "number", "boolean"].includes(type) || Array.isArray(data)) { return ret; } 
   
  if (type === "string") {
    try {
      // Best case scenario, the data can be directly parsed
      const body = JSON.parse(data);
      return {body, _priv: {...func(body), is_json: true}};
    } catch {
      // Data still in JSON format but an anti-embedding token is used
      const idx = bypassAntiEmbeddingTokens(data);
      if ( !Number.isInteger(idx) ) { return ret; } 
      try {
        const sliced = slideBodyText(idx, data);
        const body = JSON.parse(sliced);
        return {body, _priv: {...func(body), is_json: true, anti_embedding_token: true}};
      } catch {
        return ret;
        }
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
  } catch {
    // Data still in JSON format but an anti-embedding token is used
    const textResponse = await data.text();
    const idx = bypassAntiEmbeddingTokens(textResponse);
    if (!Number.isInteger(idx)) { return ret; } 
    try {
      const sliced = slideBodyText(idx, textResponse);
      const body = JSON.parse(sliced);
      return {body, _priv: {...func(body), is_json: true, anti_embedding_token: true}};
    } catch {
      return ret;
      }
  }
  return ret;
}


/**
 * 
 * @param {Number} idx 
 * @param {String} data 
 * @returns sliced data
 */
function slideBodyText(idx, data) {
  return idx >= 0 ? data.slice(idx) : data.slice(0, idx);
}


// Test function: replace and return modified HTTP message
async function modifyHTTPResponse( {response, oldString, newString} ) {
  const txt = await response.text();
  const replacedTxt = txt.replace(oldString, newString);
  return new Response(replacedTxt);
}