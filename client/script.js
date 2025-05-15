const API_BASE = 'http://localhost:3000'

function showForm(form) {
    document.getElementById('start').style.display = 'none'
    document.getElementById('registerForm').style.display = form === 'register' ? 'block' : 'none'
    document.getElementById('loginForm').style.display = form === 'login' ? 'block' : 'none'
}

function showDashboard() {
    document.getElementById('registerForm').style.display = 'none'
    document.getElementById('loginForm').style.display = 'none'
    document.getElementById('dashboard').style.display = 'block'
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
            showDashboard()
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
            showDashboard()
        } else {
            const error = await res.json()
            alert(error.message || 'Login fehlgeschlagen')
        }
    } catch (err) {
        console.error('Fehler beim Login:', err)
        alert('Verbindung zum Server fehlgeschlagen')
    }
}
