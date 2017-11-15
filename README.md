# msgx

A tiny, flexible, fast, promise-based library for messaging in Firefox and Chrome extensions.


## Install

```bash
npm install --save msgx
```

## Example

Try this example yourself with `cd test_extension && npm run build`

### Content Script

```javascript
import client from 'msgx/client'
const actions = { zoom: (zoom) => console.log(`zoom ${zoom}`) }
function onDisconnect () { console.log('disconnected') }
const debug = true
const msg = client(actions, onDisconnect, debug)
msg('zoom').then(zoom => console.log(`init zoom ${zoom})`))
msg('sum', 7).then(sum => console.log(`new sum ${sum}`)) // 7
msg('sum', 3).then(sum => console.log(`new sum ${sum}`)) // 10
```

### Background Page

```javascript
import server from 'msgx/server'
import browser from 'webextension-polyfill'
const actions = {
  sum: (n, _, data) => data.sum += n,
  zoom: (_, sender) => browser.tabs.getZoom(sender.tab.id)
}
function onConnect (sender, msg, data) {
  function onZoomChange ({ tabId, newZoomFactor }) {
    if (sender.tab.id === tabId) msg('zoom', newZoomFactor)
  }
  browser.tabs.onZoomChange.addListener(onZoomChange)
  data.onZoomChange = onZoomChange
  data.sum = 0
}
function onDisconnect (sender, data) {
  console.log(`final sum ${data.sum}`)
  browser.tabs.onZoomChange.removeListener(data.onZoomChange)
}
const debug = true
server(actions, onConnect, onDisconnect, debug)
```

## API

### server

* **server** - `(actions, onConnect, onDisconnect, debug) => void`
  * **actions** - an object in which keys are message endpoints whose values are actions, which are functions to call when a message is received. The return value of an actions is sent as the response. 
    * **action** - `(arg, sender, data) => result`
      * **arg** - the message's argument, or null if none or undefined
      * **sender** - the [MessageSender](https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/runtime/MessageSender) of the client that sent the message
      * **data** - data object that exists for the connection's lifetime. Use it to store data that should be garbage collected on disconnect.
      * **result** - value (potentiall void) to be sent as the response. If a promise, first resolved.
  * **onConnect** - `(sender, msg, data) => void`
    * **sender** - the connecting client's [MessageSender](https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/runtime/MessageSender)
    * **msg** - `(action, arg) => void`
      * **action** - a string identifying the client action that should be triggerd by a message from the server
      * **arg** - the argument that should be passed to the action
    * **data** - data object that exists for the connection's lifetime
  * **onDisconnect** - `(sender, data) => void`
    * **sender** - the disconnecting client's [MessageSender](https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/runtime/MessageSender)
    * **data** - data object that exists for the connection's lifetime
  * **debug** - a boolean that enables logging, default is true

### client

* **client** - `(actions, onDisconnect, debug) => msg`
  * **actions** - an object in which keys are message endpoints whose values are actions, which are functions called by the client when a message is received. The return value is ignored.
    * **action** - `(arg) => any`
      * **arg** - the message's argument, or null if none or undefined
  * **onDisconnect** - `(sender) => void`
    * **sender** - the client's [MessageSender](https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/runtime/MessageSender)
  * **debug** - a boolean that enables logging, default is true
  * **msg** - `(action, arg) => Promise<result>`
      * **action** - a string identifying the server action that should be triggerd by a message from the client
      * **arg** - the argument that should be passed to the action
      * **result** - the value returned by the action

## The Best Docs

msgx is tiny! Read its source code below.

### client.js

```javascript
export default function (actions = {}, onDisconnect, debug = true) {
  const port = chrome.runtime.connect()
  let t = 0
  const transactions = {}
  port.onMessage.addListener(([t, actionOrResult, arg]) => {
    if (t > 0) {
      if (debug) console.log(`rx:${t}`, actionOrResult)
      transactions[t](actionOrResult)
    } else {
      if (debug) console.log(`rx:${t}:${actionOrResult}`, arg)
      actions[actionOrResult](arg)
    }
  })
  onDisconnect && port.onDisconnect.addListener(onDisconnect)
  return (action, arg) => new Promise(resolve => {
    t++
    if (debug) console.log(`tx:${t}:${action}`, arg)
    port.postMessage([t, action, arg])
    transactions[t] = resolve
  })
}
```

### server.js

```javascript
export default function (actions = {}, onConnect, onDisconnect, debug = true) {
  chrome.runtime.onConnect.addListener(port => {
    if (debug) console.log('connect', port.sender)
    const data = {}
    port.onMessage.addListener(async ([t, action, arg]) => {
      if (debug) console.log(`rx:${t}:${action}`, arg)
      const reply = await actions[action](arg, port.sender, data)
      port.postMessage([ t, reply ])
      if (debug) console.log(`tx:${t}`, reply)
    })
    const msg = (action, arg) => {
      if (debug) console.log(`tx:${0}:${action}`, arg)
      port.postMessage([0, action, arg])
    }
    onConnect && onConnect(port.sender, msg, data)
    onDisconnect && port.onDisconnect.addListener(() => onDisconnect(port.sender, data))
  })
}
```
