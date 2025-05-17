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

      const history = chatHistory[message.room] || [];
      ws.send(JSON.stringify({ type: 'refreshHistory', messages: history }));
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

    case 'usernameChange': {
      const client = clients.find(c => c.ws === ws);
      if (client) {
        const oldName = client.user.name;
        const newName = message.user.name;

        // 1. Update Client-Name
        client.user = message.user;

        // 2. Update Name in Chatverlauf (alle Räume)
        Object.keys(chatHistory).forEach(room => {
          chatHistory[room] = chatHistory[room].map(msg => {
            if (msg.user.name === oldName) {
              return {
                ...msg,
                user: { ...msg.user, name: newName }
              };
            }
            return msg;
          });
        });

        // 3. Neue Userliste senden
        sendUserListToRoom(client.room);

        // 4. Chatverlauf neu senden (damit Clients korrekt ersetzen statt anhängen)
        broadcastToRoom(client.room, {
          type: 'refreshHistory',
          messages: chatHistory[client.room]
        });
      }
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
