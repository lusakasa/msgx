export default function server (actions, onConnect, onDisconnect, debug = true) {
  chrome.runtime.onConnect.addListener((port) => {
    if (debug) {
      console.log('client connected', port);
    }
    const data = {};
    port.onMessage.addListener(async ([t, action, arg]) => {
      if (debug) {
        console.log(`rx[${t}][${action}]`, arg);
      }
      const reply = await actions[action](arg, port.sender, data);
      port.postMessage([ t, reply ]);
      if (debug) {
        console.log(`tx[${t}]`, reply);
      }
    });
    const msg = (action, arg) => {
      if (debug) {
        console.log(`tx[${0}][${action}]`, arg, port.sender);
      }
      port.postMessage([0, action, arg]);
    };
    onConnect && onConnect(port.sender, msg, data);
    onDisconnect && port.onDisconnect.addListener(() => onDisconnect(port.sender, data));
  });
}
