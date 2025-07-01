window.DOMManipulationCheck();

window.addEventListener('message', (event) => {
  if (event.source === window && event.data.type === 'SERVICE_WORKER') {
    // TO DO: analyze {request, response}
  }
});


