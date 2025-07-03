//==============================
// Import
//==============================



//==============================
// Consts
//==============================

// The following keys are matched entirely, or considering [text/digits]_[key]
// consider distance levinshtima time
// consider translation
// expand keywords from DOM analysis (Eg., get brand name)
const ROOT_SENSITIVE_KEYS = [
  'admin',
  'free',
  'locked',
  'only', // '[subscriber]_only', '[brand]_only'
  'permission',
  'plus',
  'premium',
  'pro',
  'unlocked',
  'subscribed', // can lead to FP if used for authentication
  //role, user
];



//==============================
// Functions
//==============================

/**
 * Recursively parse JSON body looking for sensitive keys
 * @returns true if at least one sensitive key is found
 */
export function analyzeJSONBody(body) {
  const keys = matchKeys(body, ROOT_SENSITIVE_KEYS);
  return {
    is_sensitive: !!keys.length,
    keywords_matched: keys
  };
}



/**
 * @param {Array} sensitiveKeys 
 * @returns expand keys considering common scenarios (e.g., isKey, is_key, _key)
 */
export function expandKeys(sensitiveKeys = []) {
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
export function matchRegex(sensitive_key, target) {
  if (sensitive_key.charAt(0) == '_') {
    const reg = new RegExp('^(.+)' + sensitive_key + '$');
    return !!target.match(reg);
  }
  return false;
}



/**
 * @param {Object} obj 
 * @param {Array} sensitiveKeys 
 * @returns an array with the keys matched
 */
export function matchKeys(obj, sensitiveKeys = []) {
  function checkRecursively(obj, keys, visited) {
    if (obj && typeof obj === 'object') {
      // Prevent circular references
      if (visited.has(obj)) {
        return;
      }
      visited.add(obj);

      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          // Check matches  
          keys.forEach(k => {
            if ((k === key || matchRegex(k, key)) && !matchedKeys.includes(key)) {
              console.log(`[EXT] Found key '${key}', that matches '${k}'`)
              matchedKeys.push(key);
            }
          });
          // If current value is an object, check recursively
          const val = obj[key];
          if (typeof val === 'object' && val !== null) {
            checkRecursively(val, keys, visited);
          }
        }
      }
    }
  }

  const matchedKeys = [];
  const keys = expandKeys(sensitiveKeys);
  const visited = new Set();
  checkRecursively(obj, keys, visited);
  return matchedKeys;
}