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
