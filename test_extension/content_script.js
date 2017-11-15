import client from 'msgx/client'
const actions = { zoom: (zoom) => console.log(`zoom ${zoom}`) }
function onDisconnect () { console.log('disconnected') }
const debug = true
const msg = client(actions, onDisconnect, debug)
msg('zoom').then(zoom => console.log(`init zoom ${zoom})`))
msg('sum', 7).then(sum => console.log(`new sum ${sum}`)) // 7
msg('sum', 3).then(sum => console.log(`new sum ${sum}`)) // 10
