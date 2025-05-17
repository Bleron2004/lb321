const express = require('express');
const { executeSQL } = require('./database');

function initializeAPI(app) {
    app.use(express.json());

    // Registrierung
    app.post('/api/register', async (req, res) => {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ message: 'Fehlende Felder' });
        }
        // Prüfe ob User schon existiert
        const users = await executeSQL('SELECT id FROM users WHERE name = ?', [username]);
        if (users.length > 0) {
            return res.status(400).json({ message: 'Benutzer existiert bereits' });
        }
        await executeSQL('INSERT INTO users (name, password) VALUES (?, ?)', [username, password]);
        res.json({ message: 'Registrierung erfolgreich' });
    });

    // Login
    app.post('/api/login', async (req, res) => {
        const { username, password } = req.body;
        const users = await executeSQL('SELECT id FROM users WHERE name = ? AND password = ?', [username, password]);
        if (users.length === 0) {
            return res.status(401).json({ message: 'Ungültige Anmeldedaten' });
        }
        res.json({ message: 'Login erfolgreich' });
    });
}

module.exports = { initializeAPI };
