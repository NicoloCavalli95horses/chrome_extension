//==============================
// Import
//==============================



//==============================
// Consts
//==============================
const ROOT_SENSITIVE_KEYS = ['locked', 'unlocked', 'premium', 'free', 'pro', 'subscribed'];



//==============================
// Functions
//==============================

/**
 * Recursively parse JSON body looking for sensitive keys
 * @returns true if at least one sensitive key is found
 */
export function analyzeJSONBody(body) {
  return containsSensitiveKey(body, ROOT_SENSITIVE_KEYS);
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
 * @returns true if sensitive keys is found
 */
export function containsSensitiveKey(obj, sensitiveKeys = []) {
  function checkRecursively(obj, keys) {
    if (obj && typeof obj === 'object') {
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          const hasSensitiveKey = keys.some(k => key === k || matchRegex(k, key));
          if (hasSensitiveKey) {
            return true;
          }

          const value = obj[key];
          if (typeof value === 'object' && value !== null) {
            if (checkRecursively(value, keys)) {
              return true;
            }
          }
        }
      }
    }
    return false;
  }

  const keys = expandKeys(sensitiveKeys);
  return checkRecursively(obj, keys);
}