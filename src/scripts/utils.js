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
export function sendPostMessage( {type, data} ) {
  window.postMessage( {type, data}, '*');
};



/**
 * Bypass anti-embedding JSON tokens, e.g., "])}while(1);</x>//{"test":true}
 * @param {String} data - string to parse
 * @return slice index
 */
export function bypassAntiEmbeddingTokens(data) {
  let parsed = [];
  const thr = Math.min(data.length, 80); // to check
  let index = undefined;
  let is_valid = false;
  let slice_idx = undefined;
  
  if (typeof data !== 'string') { return slice_idx; }

  for (let i = 0; i < thr; i++) {
    const char = data[i];
    const isFollowingChar = i === (index + 1);

    // Search the first `{` available
    if (!parsed.length && char === '{') {
      parsed.push(char);
      index = i;
      slice_idx = i;
      continue;
    } 
    
    // if `{` exist, the following char must be `"`
    if (parsed.length == 1 && isFollowingChar) {
        if (char === '"') {
          parsed.push(char);
          index = i;
        } else if (char === '{') {
          // if we have another `{`, update indexes
          index = i;
          slice_idx = i;
        }
      continue;
    }
    
    // if `{"` exist, check that the following char is eligible
    if (parsed.length == 2 && isFollowingChar && char !== '"') {
      parsed.push(char);
      index = i;
      continue;
    } 
    
    // if `{"a` exist, keep adding other chars
    if (parsed.length > 2) {
      parsed.push(char);
      index = i;
        // there should be a `:` after idx 4
        if (parsed.length > 4 && parsed.includes(':') && !parsed.slice(0, 4).includes(':')) {
          is_valid = true;
        }
    } 
  }
  return is_valid? slice_idx : undefined;
}