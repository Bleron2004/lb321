const WebSocket = require('ws');
const clients = [];
const chatHistory = {
  Allgemein: [],
  Lernen: [],
  Coden: []
};

const initializeWebsocketServer = (server) => {
  const websocketServer = new WebSocket.Server({ server });
  websocketServer.on('connection', onConnection);
  console.log('Websocket server initialized');
};

const onConnection = (ws) => {
  console.log('New websocket connection');
  ws.on('message', (message) => onMessage(ws, message));
  ws.on('close', () => onDisconnect(ws));
};

const onMessage = (ws, messageBuffer) => {
  const message = JSON.parse(messageBuffer.toString());
  console.log('Received:', message);

  switch (message.type) {
    case 'user': {
      const index = clients.findIndex(c => c.ws === ws);
      if (index !== -1) clients.splice(index, 1);

      clients.push({ ws, user: message.user, room: message.room });
      sendUserListToRoom(message.room);

      // Chatverlauf an neuen Client senden
      const history = chatHistory[message.room] || [];
      history.forEach(msg => {
        ws.send(JSON.stringify(msg));
      });
      break;
    }

    case 'leave': {
      const index = clients.findIndex(c => c.ws === ws);
      if (index !== -1) {
        const room = clients[index].room;
        clients.splice(index, 1);
        sendUserListToRoom(room);
      }
      break;
    }

    case 'message': {
      const sender = clients.find(c => c.ws === ws);
      if (!sender) return;

      const timestamp = new Date().toLocaleTimeString('de-CH', {
        hour: '2-digit',
        minute: '2-digit'
      });

      const msg = {
        type: 'message',
        user: sender.user,
        text: message.text,
        room: sender.room,
        time: timestamp
      };

      chatHistory[sender.room].push(msg);
      broadcastToRoom(sender.room, msg);
      break;
    }

    case 'typing': {
      const sender = clients.find(c => c.ws === ws);
      if (!sender) return;

      broadcastToRoom(sender.room, {
        type: 'typing',
        user: sender.user,
        room: sender.room,
        isTyping: message.isTyping
      }, ws);
      break;
    }

    default:
      console.log('Unknown message type:', message.type);
  }
};

const onDisconnect = (ws) => {
  const index = clients.findIndex(c => c.ws === ws);
  if (index !== -1) {
    const room = clients[index].room;
    clients.splice(index, 1);
    sendUserListToRoom(room);
  }
};

function sendUserListToRoom(room) {
  const users = clients
      .filter(client => client.room === room)
      .map(client => client.user);

  const msg = JSON.stringify({ type: 'users', users });

  clients
      .filter(client => client.room === room && client.ws.readyState === WebSocket.OPEN)
      .forEach(client => client.ws.send(msg));
}

function broadcastToRoom(room, messageObj, excludeWs = null) {
  const message = JSON.stringify(messageObj);
  clients
      .filter(client =>
          client.room === room &&
          client.ws !== excludeWs &&
          client.ws.readyState === WebSocket.OPEN
      )
      .forEach(client => client.ws.send(message));
}

module.exports = { initializeWebsocketServer };
