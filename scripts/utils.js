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
    top: 10px;
    left: 10px;
    width: 100px;
    height: 100px;
    background-color: red;
    z-index: 9999;
  `;
  document.body.appendChild(el);
}