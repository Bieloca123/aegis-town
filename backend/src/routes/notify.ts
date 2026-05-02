import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { supabase } from '../supabase'
import { Server as SocketIOServer } from 'socket.io'

const NotifyBody = z.object({
    to_email: z.string().email(),
    kind: z.string().min(1).max(64),         // 'clickup_mention' | 'calendar_reminder' | etc.
    title: z.string().min(1).max(200),
    body: z.string().max(1000).optional(),
    url: z.string().url().optional(),
    icon: z.string().max(64).optional(),     // optional emoji/lucide name
})

export type NotificationPayload = z.infer<typeof NotifyBody>

export function notifyRouter(io: SocketIOServer): Router {
    const router = Router()

    // POST /webhooks/notify
    //
    // Generic external-trigger notification webhook. Accepts a JSON body
    // describing a notification (recipient by email + content), looks up
    // the recipient's user_id via profiles.email, and pushes the payload
    // to that user's personal Socket.io room. Connected clients show a
    // toast via the MentionToast component.
    //
    // Auth: Bearer token compared to NOTIFICATION_WEBHOOK_SECRET env var.
    //
    // Designed to be called from Make / n8n / ClickUp automations / cron
    // jobs / anywhere that wants to push something to an Aegis user.
    router.post('/webhooks/notify', async (req: Request, res: Response) => {
        const auth = req.headers.authorization
        const expected = process.env.NOTIFICATION_WEBHOOK_SECRET

        if (!expected) {
            return res.status(503).json({ error: 'Webhook is not configured' })
        }
        if (!auth || auth !== `Bearer ${expected}`) {
            return res.status(401).json({ error: 'Unauthorized' })
        }

        const parsed = NotifyBody.safeParse(req.body)
        if (!parsed.success) {
            return res.status(400).json({ error: 'Invalid body', details: parsed.error.flatten() })
        }

        const { to_email, kind, title, body, url, icon } = parsed.data

        const { data: profile, error } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', to_email)
            .single()

        if (error || !profile) {
            // Don't leak whether the email exists; 202 = accepted-but-unrouted
            return res.status(202).json({ delivered: false, reason: 'unknown_recipient' })
        }

        const room = `user:${profile.id}`
        const sockets = await io.in(room).fetchSockets()
        const online = sockets.length > 0

        if (online) {
            io.to(room).emit('notification', { kind, title, body, url, icon })
        }

        // Always 200 so callers don't retry on the user just being offline
        return res.status(200).json({ delivered: online, recipient_online: online })
    })

    return router
}
