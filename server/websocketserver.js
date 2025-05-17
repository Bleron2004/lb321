const WebSocket = require('ws');
const { executeSQL } = require('./database');
const clients = [];

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

const getOrCreateUserId = async (username) => {
  // Passwort wird hier ignoriert, reicht für Chat
  let users = await executeSQL('SELECT id FROM users WHERE name = ?', [username]);
  if (users.length > 0) return users[0].id;
  const result = await executeSQL('INSERT INTO users (name, password) VALUES (?, ?)', [username, '']);
  return result.insertId;
};

const sendUserListToRoom = (room) => {
  const users = clients
      .filter(client => client.room === room)
      .map(client => client.user);

  const msg = JSON.stringify({ type: 'users', users });

  clients
      .filter(client => client.room === room && client.ws.readyState === WebSocket.OPEN)
      .forEach(client => client.ws.send(msg));
};

const sendUserListToAllRooms = () => {
  const uniqueRooms = [...new Set(clients.map(c => c.room))];
  uniqueRooms.forEach(sendUserListToRoom);
};

const broadcastToRoom = (room, messageObj, excludeWs = null) => {
  const message = JSON.stringify(messageObj);
  clients
      .filter(client =>
          client.room === room &&
          client.ws !== excludeWs &&
          client.ws.readyState === WebSocket.OPEN
      )
      .forEach(client => client.ws.send(message));
};

const onMessage = async (ws, messageBuffer) => {
  let message;
  try {
    message = JSON.parse(messageBuffer.toString());
  } catch (err) {
    console.error('Invalid JSON:', err);
    return;
  }

  switch (message.type) {
    case 'user': {
      // Raumwechsel Korrektur: Bestehenden Client aktualisieren!
      const index = clients.findIndex(c => c.ws === ws);
      if (index !== -1) {
        clients[index].room = message.room;
        clients[index].user = message.user;
      } else {
        clients.push({ ws, user: message.user, room: message.room });
      }
      sendUserListToAllRooms();

      const rows = await executeSQL(`
        SELECT m.message, m.id, m.room, m.created_at, u.name
        FROM messages m
               JOIN users u ON m.user_id = u.id
        WHERE m.room = ?
        ORDER BY m.id ASC
      `, [message.room]);

      const formatted = rows.map(r => ({
        type: 'message',
        user: { name: r.name },
        text: r.message,
        room: r.room,
        time: new Date(r.created_at).toLocaleTimeString('de-CH', {
          hour: '2-digit',
          minute: '2-digit'
        })
      }));

      ws.send(JSON.stringify({ type: 'refreshHistory', messages: formatted }));
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

      try {
        const userId = await getOrCreateUserId(sender.user.name);
        await executeSQL(
            'INSERT INTO messages (user_id, message, room) VALUES (?, ?, ?)',
            [userId, message.text, sender.room]
        );

        const user = await executeSQL('SELECT name FROM users WHERE id = ?', [userId]);

        broadcastToRoom(sender.room, {
          type: 'message',
          user: { name: user[0].name },
          text: message.text,
          room: sender.room,
          time: timestamp
        });

      } catch (err) {
        console.error('Fehler beim Speichern:', err);
      }

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
      if (!client) return;

      const newName = message.user.name.trim();
      if (!newName) return;

      // Gibt es den neuen Namen schon in der DB?
      const dbUser = await executeSQL('SELECT id FROM users WHERE name = ?', [newName]);
      if (dbUser.length > 0) {
        ws.send(JSON.stringify({ type: 'error', message: 'Benutzername wird bereits verwendet.' }));
        return;
      }

      // Gibt es den bisherigen Nutzer überhaupt noch?
      const result = await executeSQL('SELECT id FROM users WHERE name = ?', [client.user.name]);
      if (result.length === 0) {
        ws.send(JSON.stringify({ type: 'error', message: 'Benutzer nicht gefunden.' }));
        return;
      }
      const userId = result[0].id;

      // Jetzt Name ändern!
      await executeSQL('UPDATE users SET name = ? WHERE id = ?', [newName, userId]);
      client.user.name = newName;

      sendUserListToAllRooms();

      // Verlauf neu laden
      const rows = await executeSQL(`
        SELECT m.message, m.id, m.room, m.created_at, u.name
        FROM messages m
               JOIN users u ON m.user_id = u.id
        WHERE m.room = ?
        ORDER BY m.id ASC
      `, [client.room]);

      const formatted = rows.map(r => ({
        type: 'message',
        user: { name: r.name },
        text: r.message,
        room: r.room,
        time: new Date(r.created_at).toLocaleTimeString('de-CH', {
          hour: '2-digit',
          minute: '2-digit'
        })
      }));

      broadcastToRoom(client.room, {
        type: 'refreshHistory',
        messages: formatted
      });

      ws.send(JSON.stringify({ type: 'usernameChanged', name: newName }));

      break;
    }

    default:
      console.log('Unbekannter Nachrichtentyp:', message.type);
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

module.exports = { initializeWebsocketServer };
