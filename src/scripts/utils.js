//==============================
// Import
//==============================



//==============================
// Utils functions
//==============================

export function DOMManipulationCheck() {
  const el = document.createElement('div');
  el.style.cssText = `
    display: block; 
    position: fixed;
    bottom: 10px;
    right: 10px;
    background-color: lightgreen;
    z-index: 9999;
    font-size: 14px;
    display: grid;
    place-content: center;
    border-radius: 10px;
    padding: 10px 12px;
    color: black;
  `;
  el.innerHTML = 'HTTP analyzer is on 🚀';
  document.body.appendChild(el);
}



/**
 * Send message with window.postMessage
 * @param {String} type - sender ID
 * @param {Object} data
 */
export function sendPostMessage( {type, data} ) {
  // This funciton is limited in the amout of data it can transfer
  const clonedData = JSON.parse(JSON.stringify(data));
  window.postMessage({type, data: clonedData}, '*');
};



/**
 * Bypass anti-embedding JSON tokens, e.g., "])}while(1);</x>//{"test":true}
 * @param {String} data - string to parse
 * @return slice index
 */
export function bypassAntiEmbeddingTokens(data) {
  if (!data.length || typeof data !== 'string') { return []; }
  let head = [];
  let tail = [];
  const thr = Math.min(data.length, 80); // No need to parse the whole object: anti-embedding tokens are usually short
  let tail_idx = undefined;
  let is_head_valid = false;
  let slice_idx_head = undefined;
  let slice_idx_tail = undefined;

  // Head
  for (let i = 0; i < thr; i++) {
    const head_char = data[i];

    // Search the first `{` available
    if (!head.length && head_char === '{') {
      head.push(head_char);
      slice_idx_head = i;
      continue;
    }

    // if `{` exist, the following head_char must be `"`
    if (head.length == 1) {
      if (head_char === '"') {
        head.push(head_char);
      } else if (head_char === '{') {
        // if we have another `{`, update indexes
        slice_idx_head = i;
      }
      continue;
    }

    // if `{"` exist, check that the following head_char is eligible
    if (head.length == 2) {
      if (!['"', '}', ':'].includes(head_char)) {
        head.push(head_char);
        continue;
      } else {
        head = [];
        slice_idx_head = i;
        continue;
      }
    }

    // if `{"a` exist, keep adding other chars
    if (head.length > 2) {
      head.push(head_char);
      // there should be a `:` after idx 4
      if (head.length > 4 && head.includes(':') && !head.slice(0, 4).includes(':')) {
        is_head_valid = true;
      }
    }
  }

  // Tail @TODO
  const min = Math.max(data.length - thr, 0);

  for (let i = data.length - 1; i >= min; i--) {
    const tail_char = data[i];

    // Search the first `}` available
    if (!tail.length && tail_char === '}') {
      tail.push(tail_char);
      tail_idx = i;
      slice_idx_tail = data.length - tail_idx - 1;
      break;
    }
  }

  const is_tail_valid = tail.includes('}');
  const idx_tail = slice_idx_tail === 0 ? undefined : slice_idx_tail * -1;

  return is_head_valid && is_tail_valid ? [slice_idx_head, idx_tail] : [];
}


/**
 * 
 * @param {String} hostname 
 * @returns domain name (string)
 */
export function getDomainName(hostname = []) {
  if (!hostname.length) { return []; }
  const domainParts = hostname.split('.');
  const isValid = domainParts.length > 2 && domainParts[0] === 'www';

  const partsToReturn = isValid
    ? domainParts.slice(1, domainParts.length - 1)
    : domainParts.slice(0, domainParts.length - 1);

  return [...new Set(partsToReturn)];
}



/**
 * Return an array of sensitive keys. The keys are matched entirely, or with [text/digits]_[key]
 *  - consider distance Levenshtein distance (https://github.com/gustf/js-levenshtein)
 *  - consider translation
 * @param {String} host - The domain name
 * @returns {Array}
 */
export function getSensitiveKeys(host) {

  const HAS_KEYS = [
    'access',
    'license',
    'permission',
    'paywall',
    'plus',
    'premium',
    'price',
    'pro',
    'reward',
    'rewards',
    'role',
    'roles',
  ];

  const IS_KEYS = [
    'active',
    'admin',
    'brand',
    'brand_only',
    'free',
    'locked',
    'me',
    'my',
    'only',
    'plus',
    'premium',
    'pro',
    'unlocked',
    'secret',
    'subscribed',
    'subscribed_only',
    'user',
  ];

  const KEYS = [ ...HAS_KEYS, ...IS_KEYS, ...getDomainName(host) ];
  const ret = [];

  KEYS.forEach(key => {
    const uppercaseKey = capitalizeFirstLetter( key.toString() );
    ret.push(key, `_${key}`, `${key}_`);
    if (IS_KEYS.includes(key) && !ret.includes(key)) {
      ret.push(`is${uppercaseKey}`, `is_${key}`);
    }

    if (HAS_KEYS.includes(key) && !ret.includes(key)) {
      ret.push(`has${uppercaseKey}`, `has_${key}`)
    }
  });

  return ret;
}



export const SENSITIVE_KEYS = getSensitiveKeys(window.location?.host);



export function deepObjCopy(obj) {
  return JSON.parse(JSON.stringify(obj));
}



export function capitalizeFirstLetter(str) {
  if (!str.length) { return;}
  return str.charAt(0).toUpperCase() + str.slice(1);
};