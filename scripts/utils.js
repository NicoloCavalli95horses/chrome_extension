//==============================
// Utils
//==============================
/**
 * It is not possible to import/export functions as in ES6
 * Bind functions to the window object to use them in content_script
 * 
 * This utils.js file must be loaded before content_script.js
*/



/**
 * Create a red square and append it to the body
 */
window.DOMManipulationCheck = () => {
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
  `;
  el.innerHTML = 'HTTP analyzer is on 🚀'
  document.body.appendChild(el);
}