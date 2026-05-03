import express from 'express'
import cors from 'cors'
import http from 'http'
import { Server as SocketIOServer } from 'socket.io'
import { sockets } from './sockets/sockets'
import routes from './routes/routes'
import { notifyRouter } from './routes/notify'
import { clickupRouter } from './routes/clickup'
import { clickupWebhookRouter } from './routes/clickup-webhook'
import { supabase } from './supabase'
import { sessionManager } from './session'

require('dotenv').config()

const app = express()
const server = http.createServer(app)

app.use(cors({
    origin: process.env.FRONTEND_URL
}))

// JSON body parser — required by /webhooks/notify (and any future webhooks).
// `verify` captures the raw body bytes onto req so HMAC signature verification
// (used by /webhooks/clickup) can run on the exact payload ClickUp signed.
app.use(express.json({
    limit: '64kb',
    verify: (req, _res, buf) => {
        ;(req as express.Request & { rawBody?: Buffer }).rawBody = buf
    },
}))

// Initialize Socket.IO server
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.FRONTEND_URL
  }
})

app.use(routes())
app.use(notifyRouter(io))
app.use(clickupRouter())
app.use(clickupWebhookRouter(io))

sockets(io)

function onRealmUpdate(payload: any) {
    const id = payload.new.id
    let refresh = false
    if (JSON.stringify(payload.new.map_data) !== JSON.stringify(payload.old.map_data)) {
        refresh = true
    }
    if (payload.new.share_id !== payload.old.share_id) {
        refresh = true
    }
    if (payload.new.only_owner) {
        refresh = true
    }
    if (refresh) {
        sessionManager.terminateSession(id, "This realm has been changed by the owner.")
    }
}

function onRealmDelete(payload: any) {
    sessionManager.terminateSession(payload.old.id, "This realm is no longer available.")
}

supabase
    .channel('realms')
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'realms' }, onRealmUpdate)
    .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'realms' }, onRealmDelete)
    .subscribe()

const PORT = process.env.PORT || 3001
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}.`)
})


export { io }