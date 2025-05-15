const express = require('express')
const http = require('http')
const cors = require('cors')
var livereload = require('livereload')
var connectLiveReload = require('connect-livereload')
const { initializeWebsocketServer } = require('./websocketserver')
const { initializeAPI } = require('./api')
const { initializeMariaDB, initializeDBSchema } = require('./database')

const app = express()
const server = http.createServer(app)

// CORS aktivieren – erlaubt Anfragen vom Client (z.B. :8080)
app.use(cors())

// JSON Body Parsing aktivieren (wichtig für POST requests wie /api/register)
app.use(express.json())

const env = process.env.NODE_ENV || 'development'
if (env !== 'production') {
  const liveReloadServer = livereload.createServer()
  liveReloadServer.server.once('connection', () => {
    setTimeout(() => {
      liveReloadServer.refresh('/')
    }, 100)
  })

  app.use(connectLiveReload())
}

// Statische Dateien bereitstellen
app.use(express.static('client'))

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/client/index.html')
})

// WebSocket & API initialisieren
initializeWebsocketServer(server)
initializeAPI(app)

;(async function () {
  initializeMariaDB()
  await initializeDBSchema()
  const serverPort = process.env.PORT || 3000
  server.listen(serverPort, () => {
    console.log(`Express Server started on port ${serverPort} as '${env}' Environment`)
  })
})()
