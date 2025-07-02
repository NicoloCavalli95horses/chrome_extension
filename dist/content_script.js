function o(){let e=document.createElement("div");e.style.cssText=`
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
  `,e.innerHTML="HTTP analyzer is on \u{1F680}",document.body.appendChild(e)}o();window.addEventListener("message",e=>{e.source===window&&e.data.type==="SERVICE_WORKER"&&e.data.data.response._SENSITIVE&&console.log("Likely sensitive =>",e.data.data.response)});
