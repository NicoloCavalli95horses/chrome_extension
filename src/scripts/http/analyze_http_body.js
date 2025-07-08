//==============================
// Import
//==============================
import {
  SENSITIVE_KEYS,
} from '../utils.js'


//==============================
// Consts
//==============================



//==============================
// Functions
//==============================

/**
 * Recursively parse JSON body looking for sensitive keys
 * @returns true if at least one sensitive key is found
 */
export function analyzeJSONBody(body) {
  const keys = matchKeys(body, SENSITIVE_KEYS);
  return {
    is_sensitive: !!keys.length,
    keywords_matched: keys
  };
}



/**
 * @param {String} sensitiveKeys 
 * @param {String} target 
 * @returns true if the target match a sensitive keys
 */
export function matchRegex(sensitive_key, target) {
  if (sensitive_key.charAt(0) == '_') {
    const reg = new RegExp(sensitive_key + '$');
    return !!target.match(reg);
  } 

  if (sensitive_key.charAt(sensitive_key.length - 1) == '_') {
    const reg = new RegExp('^' + sensitive_key); 
    return !!target.match(reg);
  }

  return false;
}



/**
 * @param {Object} obj 
 * @param {Array} sensitiveKeys 
 * @returns an array with the keys matched
 */
export function matchKeys(obj, keys = []) {
  const checkRecursively = (obj, keys, visited) => {
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
  const visited = new Set();
  checkRecursively(obj, keys, visited);
  return matchedKeys;
}