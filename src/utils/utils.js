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
  `;
  el.innerHTML = 'HTTP analyzer is on 🚀'
  document.body.appendChild(el);
}