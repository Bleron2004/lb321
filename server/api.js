const express = require('express');
const axios = require('axios');
const { executeSQL } = require('./database');

function initializeAPI(app) {
    app.use(express.json());

    app.post('/api/register', async (req, res) => {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ message: 'Fehlende Felder' });
        }
        const users = await executeSQL('SELECT id FROM users WHERE name = ?', [username]);
        if (users.length > 0) {
            return res.status(400).json({ message: 'Benutzer existiert bereits' });
        }
        await executeSQL('INSERT INTO users (name, password) VALUES (?, ?)', [username, password]);
        res.json({ message: 'Registrierung erfolgreich' });
    });

    app.post('/api/login', async (req, res) => {
        const { username, password } = req.body;
        const users = await executeSQL('SELECT id FROM users WHERE name = ? AND password = ?', [username, password]);
        if (users.length === 0) {
            return res.status(401).json({ message: 'Ungültige Anmeldedaten' });
        }
        res.json({ message: 'Login erfolgreich' });
    });

    // **WICHTIG: OLLAMA-Proxy**
    app.post('/api/ai', async (req, res) => {
        const { prompt } = req.body;
        if (!prompt) {
            return res.status(400).json({ error: 'Kein Prompt angegeben' });
        }
        try {
            // Proxy an OLLAMA!
            const ollamaRes = await axios.post(
                'http://ollama:11434/api/generate',
                {
                    model: 'mistral',
                    prompt: prompt,
                    stream: false
                },
                {
                    headers: { 'Content-Type': 'application/json' }
                }
            );
            const aiText = ollamaRes.data.response || ollamaRes.data.message?.content || "Keine Antwort erhalten.";
            res.json({ answer: aiText });
        } catch (err) {
            console.error(err.response?.data || err);
            res.status(500).json({ error: 'Fehler bei der KI-Antwort.' });
        }
    });
}

module.exports = { initializeAPI };
