const express = require('express')

let users = []

function initializeAPI(app) {
    app.use(express.json())

    app.post('/api/register', (req, res) => {
        const { username, password } = req.body
        if (users.find(u => u.username === username)) {
            return res.status(400).json({ message: 'Benutzer existiert bereits' })
        }
        users.push({ username, password })
        res.json({ message: 'Registrierung erfolgreich' })
    })

    app.post('/api/login', (req, res) => {
        const { username, password } = req.body
        const user = users.find(u => u.username === username && u.password === password)
        if (!user) {
            return res.status(401).json({ message: 'Ungültige Anmeldedaten' })
        }
        res.json({ message: 'Login erfolgreich' })
    })
}

module.exports = { initializeAPI }
