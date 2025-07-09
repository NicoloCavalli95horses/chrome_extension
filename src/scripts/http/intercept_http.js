//==============================
// Import
//==============================
import {
  deepObjCopy,
  sendPostMessage,
  SENSITIVE_KEYS,
  bypassAntiEmbeddingTokens,
} from '../utils.js';



//==============================
// Const
//==============================


// Interface for HTTP message description
const _priv = Object.freeze({
  is_json: false,
  is_sensitive: false,
  keywords_matched: [],
  anti_embedding_token: false,
  sensitive_keys: SENSITIVE_KEYS,
});



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
    const uri = decodeURIComponent(this._url);

    if (uri?.includes('course_pack_fr_pronunciation?translations=fr')) {
      console.log(true,  uri )
    }

    return {
      uri,
      verb: this._method,
      headers: this._requestHeaders,
      body: getRequestBody(data),
      _priv: analyzeReqURI(uri)
    };
  };

  // Override send to handle response and errors
  XHR.send = async function (data) {
    const handleResponse = async (_) => {
      const request = buildRequest.call(this, data); // Use the centralized request builder
      const responseText = await getXHResponseText(this);
      const response = {
        status: this.status,
        headers: this.getAllResponseHeaders(),
        ...getXHResponseBody( {data: responseText, func: bodyAnalysisFn} ),
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


async function getXHResponseText( data ) {
  if (['json', 'document', 'formdata'].includes(data.responseType)) {
    return data.response;
  } 
  
  if (['text', ''].includes(data.responseType)) {
    return data.responseText;
  } 
  
  if (data.responseType === 'blob') {
    return await new Response(data.response).text() // blob object
  } 
  
  if (data.responseType === 'arraybuffer') {
    const decoder = new TextDecoder('utf-8');
    return decoder.decode(data.response);
  }
}


/**
 * @param {ReadableStream} data - The XMLHttpRequest response body
 * @param {Function} func - Function that parses JSON data
 * @returns {Object} The parsed data
 */
function getXHResponseBody( {data, func} ) {
  const ret = {
    body: data || {},
    _priv: deepObjCopy(_priv),
  };

  if (!data) { return ret; } 
  const type = typeof data;

  if (["object", "number", "boolean"].includes(type) || Array.isArray(data)) { return ret; } 
   
  if (type === "string") {
    try {
      // Best case scenario, the data can be directly parsed
      const body = JSON.parse(data);
      ret.body = body;
      ret._priv = { ...ret._priv, ...func(body), is_json: true}
      return ret;
    } catch {
      // Data still in JSON format but an anti-embedding token is used
      const idx = bypassAntiEmbeddingTokens(data);
      if ( !idx.length || idx.every(i => !Number.isInteger(i)) ) { return ret; } 
      try {
        const sliced = slideBodyText(idx, data);
        const body = JSON.parse(sliced);
        ret.body = body;
        ret._priv = { ...ret._priv, ...func(body), is_json: true, anti_embedding_token: true};
        return ret;
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

      request._priv = analyzeReqURI(request.uri);

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
    body: await data.text(), // original data can be read only once
    _priv: deepObjCopy(_priv),
  };

  // #1 Regular JSON
  let jsonResponse = null;
  try {
    jsonResponse = JSON.parse(ret.body);
    if (jsonResponse) {
      ret.body = jsonResponse;
      ret._priv = { ...ret._priv, is_json: true, ...func(jsonResponse) };
      return ret;
    }
  } catch (err) {
    // console.error('Error during parsing JSON, trying sanitizing text...', err, ret.body);
  }
  
  // #2 JSON with anti-embedding token
  const idx = bypassAntiEmbeddingTokens(ret.body);
  if ( !idx.length || idx.every(i => !Number.isInteger(i)) ) { return ret; }

  try {
    const sliced = slideBodyText(idx, ret.body);
    ret.body = JSON.parse(sliced);
    ret._priv = {...ret._priv, ...func(body), is_json: true, anti_embedding_token: true};
    return ret;
  } catch {
    console.error('Error during parsing text with anti-embedding token: ', err, ret.body);
  }

  // #3 catch-all
  return ret;
}


/**
 * 
 * @param {Array} idx 
 * @param {String} data 
 * @returns sliced data
 */
function slideBodyText(idx, data) {
  return data.slice(idx[0], idx[1]);
}


// Test function: replace and return modified HTTP message
async function modifyHTTPResponse( {response, oldString, newString} ) {
  const txt = await response.text();
  const replacedTxt = txt.replace(oldString, newString);
  return new Response(replacedTxt);
}



function analyzeReqURI(uri) {
  const ret = { ...deepObjCopy(_priv) };

  if ( !uri || typeof uri !== 'string') { return ret; }

  const keywords_matched = [];
  const split = [...new Set(uri.split(/[.?:\/-]/))];

  // @TODO: esclude host name from sensitive keys in this case (too many FP)
  SENSITIVE_KEYS.forEach(k => {
    if (split.includes(k) && !keywords_matched.includes(k)) {
      keywords_matched.push(k);
    }
  });

  return {
    ...ret,
    is_sensitive: !!keywords_matched.length,
    keywords_matched,
  };
} 