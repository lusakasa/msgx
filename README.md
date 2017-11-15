# msgx

A tiny, flexible, fast, promise-based library for messaging in Firefox and Chrome extensions.


## Install

```bash
npm install --save msgx
```

## Usage

### Example

Try this example yourself with `cd test_extension && npm run build`

Content Script:

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

Background Page:

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

### Terminology

* **Client** - an end user that requests data (typically a content script)
* **Server** - the primary data source, but also capable of pushing data to clients
* **[MessageSender](https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/runtime/MessageSender)** - an object containing metadata about a client, e.g. its url, tabId, etc. 
* **Action** - a function triggered when a message is received, its return value is the response
* **Messager** - a function used to send messages to endpoints and fetch the response
* **Data** - data stored in the server unique to each connected client

### Types

* **ClientMessager** - `(action: string, arg: any): Promise<any>`
* **ServerMessager** - `(action: string, arg: any): void`
* **ClientAction** - `(arg: any): Promise<any>`
* **ServerAction** - `(arg: any, sender: MessageSender, data: Object): Promise<any>`
* **ServerOnConnect** - `(sender: MessageSender, msg: Messager, data: Object): void`
* **ClientOnDisconnect** - `(sender: MessageSender): void`
* **ServerOnDisconnect** - `(sender: MessageSender, data: Object): void`

## The Best Docs

msgx is tiny! Read its source code below

### server.js

```javascript
export default function (actions, onConnect, onDisconnect, debug = true) {
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

### client.js

```javascript
export default function (actions, onDisconnect, debug = true) {
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
  return async (action, arg) => {
    return new Promise(resolve => {
      t++
      if (debug) console.log(`tx:${t}:${action}`, arg)
      port.postMessage([t, action, arg])
      transactions[t] = resolve
    })
  }
}
```
