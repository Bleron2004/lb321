const WebSocket = require('ws')

const clients = []

const initializeWebsocketServer = (server) => {
  console.log('Initializing websocket server')
  const websocketServer = new WebSocket.Server({ server })
  websocketServer.on('connection', onConnection)
  console.log('Websocket server initialized')
}

const onConnection = (ws) => {
  console.log('New websocket connection')
  ws.on('message', (message) => onMessage(ws, message))
}

const onMessage = (ws, messageBuffer) => {
  const messageString = messageBuffer.toString()
  const message = JSON.parse(messageString)
  console.log('Received message: ' + messageString)

  switch (message.type) {
    case 'user': {
      clients.push({ ws, user: message.user })
      const usersMessage = {
        type: 'users',
        users: clients.map((client) => client.user),
      }
      clients.forEach((client) => {
        client.ws.send(JSON.stringify(usersMessage))
      })
      ws.on('close', () => onDisconnect(ws))
      break
    }

    case 'message': {
      clients.forEach((client) => {
        if (client.ws.readyState === WebSocket.OPEN) {
          client.ws.send(JSON.stringify({
            type: 'message',
            user: clients.find(c => c.ws === ws)?.user || { name: 'Unbekannt' },
            text: message.text
          }))
        }
      })
      break
    }

    default: {
      console.log('Unknown message type: ' + message.type)
    }
  }
}

const onDisconnect = (ws) => {
  const index = clients.findIndex((client) => client.ws === ws)
  clients.splice(index, 1)
  const usersMessage = {
    type: 'users',
    users: clients.map((client) => client.user),
  }
  clients.forEach((client) => {
    client.ws.send(JSON.stringify(usersMessage))
  })
}

module.exports = { initializeWebsocketServer }
