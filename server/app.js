const express = require('express')
const http = require('http')
var livereload = require('livereload')
var connectLiveReload = require('connect-livereload')
const { initializeWebsocketServer } = require('./websocketserver')
const { initializeAPI } = require('./api')
const { initializeMariaDB, initializeDBSchema } = require('./database')

const app = express()
const server = http.createServer(app)


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

app.use(express.static('client'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/client/index.html')
})
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
