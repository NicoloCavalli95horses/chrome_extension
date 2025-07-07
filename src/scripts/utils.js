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
  el.innerHTML = 'HTTP analyzer is on 🚀'
  document.body.appendChild(el);
}


/**
 * Send message with window.postMessage
 * @param {String} type - sender ID
 * @param {Object} data
 */
export function sendPostMessage({ type, data }) {
  window.postMessage({ type, data }, '*');
};



/**
 * Bypass anti-embedding JSON tokens, e.g., "])}while(1);</x>//{"test":true}
 * @param {String} data - string to parse
 * @return slice index
 */

export function bypassAntiEmbeddingTokens(data) {
  if (!data.length || typeof data !== 'string') { return; }
  let head = [];
  let tail = [];
  const thr = Math.min(data.length, 80); // No need to parse the whole object: anti-embedding tokens are usually short
  let head_idx = undefined;
  let tail_idx = undefined;
  let is_head_valid = false;
  let slice_idx_head = undefined;
  let slice_idx_tail = undefined;

  // Head
  for (let i = 0; i < thr; i++) {
    const head_char = data[i];
    const is_next_char = i === (head_idx + 1);

    // Search the first `{` available
    if (!head.length && head_char === '{') {
      head.push(head_char);
      head_idx = i;
      slice_idx_head = i;
      continue;
    }

    // if `{` exist, the following head_char must be `"`
    if (head.length == 1) {
      if (head_char === '"') {
        head.push(head_char);
        head_idx = i;
      } else if (head_char === '{') {
        // if we have another `{`, update indexes
        head_idx = i;
        slice_idx_head = i;
      }
      continue;
    }

    // if `{"` exist, check that the following head_char is eligible
    if (head.length == 2) {
      if (!['"', '}', ':'].includes(head_char)) {
        head.push(head_char);
        head_idx = i;
        continue;
      } else {
        head = [];
        head_idx = i;
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

  // Tail
  const min = Math.max(data.length - thr, 0);

  for (let i = data.length - 1; i >= min; i--) {
    const tail_char = data[i];

    // Search the first `}` available
    if (!tail.length && tail_char === '}') {
      tail.push(tail_char);
      tail_idx = i;
      slice_idx_tail = data.length - tail_idx - 1;
      continue;
    }

    // if we have another `}`, update indexes
    if (tail.length == 1 && tail_char === '}' && i > head_idx) {
      tail_idx = i;
      slice_idx_tail = data.length - tail_idx - 1;
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
export function getDomainName(hostname) {
  const domainParts = hostname.split('.');
  const isValid = domainParts.length > 2 && domainParts[0] === 'www';
  
  const partsToReturn = isValid
    ? domainParts.slice(1, domainParts.length - 1)
    : domainParts.slice(0, domainParts.length - 1);

  return [...new Set(partsToReturn)];
}