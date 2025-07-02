// src/scripts/utils.js
function DOMManipulationCheck() {
  const el = document.createElement("div");
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
  el.innerHTML = "HTTP analyzer is on \u{1F680}";
  document.body.appendChild(el);
}

// src/content_script.js
DOMManipulationCheck();
window.addEventListener("message", (event) => {
  if (event.source === window && ["FETCH_EVENT", "XML_EVENT"].includes(event.data.type)) {
    if (event.data.data?.response?._priv?.sensitive?.is_sensitive) {
      console.log(event.data.data);
    }
  }
});
