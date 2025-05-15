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
                    p.textContent = `${data.user.name}: ${data.text}`;
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

function switchRoom(newRoom) {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
            type: 'leave',
            user: currentUser,
            room: currentRoom
        }));
    }

    currentRoom = newRoom;
    document.getElementById('roomName').textContent = currentRoom;
    document.getElementById('messages').innerHTML = '';
    document.getElementById('typingStatus').textContent = '';

    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
            type: 'user',
            user: currentUser,
            room: currentRoom
        }));
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const sendButton = document.getElementById('sendMessage');
    const input = document.getElementById('messageInput');

    sendButton.addEventListener('click', () => {
        const text = input.value.trim();
        if (!text || !socket || socket.readyState !== WebSocket.OPEN) return;

        socket.send(JSON.stringify({
            type: 'message',
            text,
            room: currentRoom
        }));

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
