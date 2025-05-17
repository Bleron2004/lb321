const API_BASE = 'http://localhost:3000';
let socket = null;
let currentUser = null;
let currentRoom = 'Allgemein';

function showForm(form) {
    document.getElementById('start').style.display = 'none';
    document.getElementById('registerForm').style.display = form === 'register' ? 'block' : 'none';
    document.getElementById('loginForm').style.display = form === 'login' ? 'block' : 'none';
    document.getElementById('chat').style.display = 'none';
    document.getElementById('userListContainer').style.display = 'none';
}

function showChat() {
    document.getElementById('registerForm').style.display = 'none';
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('start').style.display = 'none';
    document.getElementById('chat').style.display = 'block';
    document.getElementById('userListContainer').style.display = 'block';
    document.getElementById('usernameChangeContainer').style.display = 'block';
    document.getElementById('roomName').textContent = currentRoom;
}

async function register() {
    const username = document.getElementById('regUsername').value;
    const password = document.getElementById('regPassword').value;

    try {
        const res = await fetch(`${API_BASE}/api/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        if (res.ok) {
            currentUser = { name: username };
            showChat();
            connectWebSocket();
        } else {
            const error = await res.json();
            alert(error.message || 'Registrierung fehlgeschlagen');
        }
    } catch (err) {
        console.error('Fehler bei der Registrierung:', err);
        alert('Verbindung zum Server fehlgeschlagen');
    }
}

async function login() {
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const res = await fetch(`${API_BASE}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        if (res.ok) {
            currentUser = { name: username };
            showChat();
            connectWebSocket();
        } else {
            const error = await res.json();
            alert(error.message || 'Login fehlgeschlagen');
        }
    } catch (err) {
        console.error('Fehler beim Login:', err);
        alert('Verbindung zum Server fehlgeschlagen');
    }
}

function changeUsername() {
    const newName = document.getElementById('newUsernameInput').value.trim();
    if (!newName || !socket || socket.readyState !== WebSocket.OPEN) return;

    // NICHT direkt ändern – warte auf Bestätigung!
    socket.send(JSON.stringify({
        type: 'usernameChange',
        user: { ...currentUser, name: newName },
        room: currentRoom
    }));

    document.getElementById('newUsernameInput').value = '';
}

function connectWebSocket() {
    socket = new WebSocket('ws://localhost:3000');

    socket.addEventListener('open', () => {
        console.log('WebSocket verbunden');
        socket.send(JSON.stringify({ type: 'user', user: currentUser, room: currentRoom }));
    });

    socket.addEventListener('message', (event) => {
        const data = JSON.parse(event.data);

        switch (data.type) {
            case 'message':
                if (data.room === currentRoom) {
                    const p = document.createElement('p');
                    const time = data.time ? `[${data.time}] ` : '';
                    p.textContent = `${time}${data.user.name}: ${data.text}`;
                    document.getElementById('messages').appendChild(p);
                }
                break;

            case 'users':
                updateUserList(data.users);
                break;

            case 'typing':
                if (data.room === currentRoom && data.user.name !== currentUser.name) {
                    const el = document.getElementById('typingStatus');
                    el.textContent = data.isTyping ? `${data.user.name} schreibt ...` : '';
                }
                break;

            case 'refreshHistory':
                if (data.messages && Array.isArray(data.messages)) {
                    const container = document.getElementById('messages');
                    container.innerHTML = '';
                    data.messages.forEach(msg => {
                        if (msg.room === currentRoom) {
                            const p = document.createElement('p');
                            const time = msg.time ? `[${msg.time}] ` : '';
                            p.textContent = `${time}${msg.user.name}: ${msg.text}`;
                            container.appendChild(p);
                        }
                    });
                }
                break;

            case 'usernameChanged':
                alert(`Dein Benutzername wurde geändert zu: ${data.name}`);
                currentUser.name = data.name;
                break;

            case 'error':
                alert(data.message);
                // Namen NICHT ändern!
                break;

        }
    });

    socket.addEventListener('close', () => console.log('WebSocket getrennt'));
    socket.addEventListener('error', (err) => console.error('WebSocket Fehler:', err));
}

function updateUserList(users) {
    const list = document.getElementById('userList');
    list.innerHTML = '';
    const uniqueNames = [...new Set(users.map(u => u.name))];
    uniqueNames.forEach(name => {
        const li = document.createElement('li');
        li.textContent = name;
        list.appendChild(li);
    });
}

function switchRoom(roomName) {
    currentRoom = roomName;
    document.getElementById('roomName').textContent = roomName;
    document.getElementById('messages').innerHTML = '';
    document.getElementById('typingStatus').textContent = '';
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'user', user: currentUser, room: currentRoom }));
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const sendButton = document.getElementById('sendMessage');
    const input = document.getElementById('messageInput');

    sendButton.addEventListener('click', () => {
        const text = input.value.trim();
        if (!text || !socket || socket.readyState !== WebSocket.OPEN) return;

        const message = {
            type: 'message',
            text,
            room: currentRoom
        };

        socket.send(JSON.stringify(message));
        input.value = '';

        socket.send(JSON.stringify({ type: 'typing', user: currentUser, room: currentRoom, isTyping: false }));
    });

    input.addEventListener('input', () => {
        if (socket && socket.readyState === WebSocket.OPEN) {
            const isTyping = input.value.trim().length > 0;
            socket.send(JSON.stringify({ type: 'typing', user: currentUser, room: currentRoom, isTyping }));
        }
    });

    document.querySelectorAll('[data-room]').forEach(btn => {
        btn.addEventListener('click', () => {
            switchRoom(btn.getAttribute('data-room'));
        });
    });
});
