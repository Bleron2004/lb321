const API_BASE = 'http://localhost:3000'

let socket = null
let currentUser = null

function showForm(form) {
    document.getElementById('start').style.display = 'none'
    document.getElementById('registerForm').style.display = form === 'register' ? 'block' : 'none'
    document.getElementById('loginForm').style.display = form === 'login' ? 'block' : 'none'
    document.getElementById('chat').style.display = 'none'
}

function showChat() {
    document.getElementById('registerForm').style.display = 'none'
    document.getElementById('loginForm').style.display = 'none'
    document.getElementById('start').style.display = 'none'
    document.getElementById('chat').style.display = 'block'
}

async function register() {
    const username = document.getElementById('regUsername').value
    const password = document.getElementById('regPassword').value

    try {
        const res = await fetch(`${API_BASE}/api/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        })

        if (res.ok) {
            currentUser = { name: username }
            showChat()
            connectWebSocket()
        } else {
            const error = await res.json()
            alert(error.message || 'Registrierung fehlgeschlagen')
        }
    } catch (err) {
        console.error('Fehler bei der Registrierung:', err)
        alert('Verbindung zum Server fehlgeschlagen')
    }
}

async function login() {
    const username = document.getElementById('loginUsername').value
    const password = document.getElementById('loginPassword').value

    try {
        const res = await fetch(`${API_BASE}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        })

        if (res.ok) {
            currentUser = { name: username }
            showChat()
            connectWebSocket()
        } else {
            const error = await res.json()
            alert(error.message || 'Login fehlgeschlagen')
        }
    } catch (err) {
        console.error('Fehler beim Login:', err)
        alert('Verbindung zum Server fehlgeschlagen')
    }
}

function connectWebSocket() {
    socket = new WebSocket('ws://localhost:3000')

    socket.addEventListener('open', () => {
        console.log('WebSocket verbunden')
        socket.send(JSON.stringify({ type: 'user', user: currentUser }))
    })

    socket.addEventListener('message', (event) => {
        const data = JSON.parse(event.data)

        if (data.type === 'message') {
            const p = document.createElement('p')
            p.textContent = `${data.user.name}: ${data.text}`
            document.getElementById('messages').appendChild(p)
        }

        if (data.type === 'users') {
            console.log('Aktive Benutzer:', data.users)
        }
    })

    socket.addEventListener('close', () => console.log('WebSocket getrennt'))
    socket.addEventListener('error', (err) => console.error('WebSocket Fehler:', err))
}

document.addEventListener('DOMContentLoaded', () => {
    const sendButton = document.getElementById('sendMessage')
    const input = document.getElementById('messageInput')

    sendButton.addEventListener('click', () => {
        const text = input.value.trim()
        if (!text || !socket || socket.readyState !== WebSocket.OPEN) return

        const message = {
            type: 'message',
            text
        }

        socket.send(JSON.stringify(message))
        input.value = ''
    })
})
