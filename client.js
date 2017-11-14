export default function client (actions, onDisconnect, debug = true) {
  const port = chrome.runtime.connect();
  let t = 0;
  const transactions = {};
  port.onMessage.addListener(([t, actionOrResult, arg]) => {
    if (t > 0) {
      if (debug) {
        console.log(`rx[${t}]`, actionOrResult);
      }
      transactions[t](actionOrResult);
    } else {
      if (debug) {
        console.log(`rx[${t}][${actionOrResult}]`, arg);
      }
      actions[actionOrResult](arg);
    }
  });
  onDisconnect && port.onDisconnect.addListener(onDisconnect);
  async function msg (action, arg) {
    return new Promise((resolve) => {
      t++;
      if (debug) {
        console.log(`tx[${t}][${action}]`, arg);
      }
      port.postMessage([t, action, arg]);
      transactions[t] = resolve;
    });
  };
  return msg;
}
