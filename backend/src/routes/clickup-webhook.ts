import { Router, Request, Response } from 'express'
import crypto from 'crypto'
import { Server as SocketIOServer } from 'socket.io'
import { supabase } from '../supabase'

// POST /webhooks/clickup
//
// Receives ClickUp native webhook events. Validates the X-Signature header
// against CLICKUP_WEBHOOK_SECRET (HMAC-SHA256 of the raw request body),
// then routes specific events to the right Aegis user via the in-memory
// mapping at profiles.clickup_user_id → user.id.
//
// Subscribed events (configured at registration time):
//   - taskCommentPosted    → toast for any @-mentioned user
//   - taskAssigneeUpdated  → toast for the newly-added assignee
//
// Register the webhook once via backend/scripts/register-clickup-webhook.ts.

type ClickupCommentSegment = {
    text?: string
    type?: string
    user?: { id?: number }
    attributes?: { advanced?: { user_id?: number }; user?: { id?: number } }
}

type ClickupHistoryItem = {
    field?: string
    type?: number
    comment?: {
        comment?: ClickupCommentSegment[]
        comment_text?: string
        user?: { id?: number; username?: string }
    }
    after?: { id?: number; username?: string }
    before?: { id?: number; username?: string }
    user?: { id?: number; username?: string }
}

type ClickupWebhookPayload = {
    event?: string
    task_id?: string
    team_id?: string
    history_items?: ClickupHistoryItem[]
    webhook_id?: string
}

function verifySignature(rawBody: Buffer | undefined, header: string | undefined, secret: string): boolean {
    if (!rawBody || !header) return false
    const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
    const provided = header.startsWith('sha256=') ? header.slice('sha256='.length) : header
    if (expected.length !== provided.length) return false
    try {
        return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(provided, 'hex'))
    } catch {
        return false
    }
}

function extractMentionedUserIds(comment: ClickupHistoryItem['comment']): number[] {
    if (!comment?.comment) return []
    const ids = new Set<number>()
    for (const seg of comment.comment) {
        const id =
            seg.user?.id ??
            seg.attributes?.user?.id ??
            seg.attributes?.advanced?.user_id
        if (typeof id === 'number') ids.add(id)
    }
    return Array.from(ids)
}

function extractAddedAssignees(history: ClickupHistoryItem[]): { id: number; username?: string }[] {
    const added: { id: number; username?: string }[] = []
    for (const h of history) {
        // ClickUp emits separate history items for each assignee change; the
        // `after` block holds the newly-added user when field === 'assignee_add'.
        if (h.field === 'assignee_add' && typeof h.after?.id === 'number') {
            added.push({ id: h.after.id, username: h.after.username })
        }
    }
    return added
}

async function profileIdsForClickupUserIds(clickupUserIds: number[]): Promise<Map<number, string>> {
    if (clickupUserIds.length === 0) return new Map()
    const { data, error } = await supabase
        .from('profiles')
        .select('id, clickup_user_id')
        .in('clickup_user_id', clickupUserIds)
    if (error || !data) return new Map()
    const out = new Map<number, string>()
    for (const row of data as Array<{ id: string; clickup_user_id: number | null }>) {
        if (row.clickup_user_id != null) out.set(Number(row.clickup_user_id), row.id)
    }
    return out
}

async function fetchTaskMeta(taskId: string): Promise<{ name?: string; url?: string }> {
    const token = process.env.CLICKUP_API_TOKEN
    if (!token) return {}
    try {
        const res = await fetch(`https://api.clickup.com/api/v2/task/${encodeURIComponent(taskId)}`, {
            headers: { Authorization: token },
        })
        if (!res.ok) return { url: `https://app.clickup.com/t/${taskId}` }
        const data = (await res.json()) as { name?: string; url?: string }
        return { name: data.name, url: data.url ?? `https://app.clickup.com/t/${taskId}` }
    } catch {
        return { url: `https://app.clickup.com/t/${taskId}` }
    }
}

function emitToProfile(io: SocketIOServer, profileId: string, payload: {
    kind: string
    title: string
    body?: string
    url?: string
    icon?: string
}) {
    io.to(`user:${profileId}`).emit('notification', payload)
}

function truncate(text: string, max = 200): string {
    if (text.length <= max) return text
    return text.slice(0, max - 1) + '…'
}

export function clickupWebhookRouter(io: SocketIOServer): Router {
    const router = Router()

    router.post('/webhooks/clickup', async (req: Request, res: Response) => {
        const secret = process.env.CLICKUP_WEBHOOK_SECRET
        if (!secret) {
            return res.status(503).json({ error: 'webhook_not_configured' })
        }

        const rawBody = (req as Request & { rawBody?: Buffer }).rawBody
        const sig = req.header('X-Signature') ?? req.header('x-signature')
        if (!verifySignature(rawBody, sig ?? undefined, secret)) {
            return res.status(401).json({ error: 'bad_signature' })
        }

        const payload = req.body as ClickupWebhookPayload
        const event = payload.event
        const taskId = payload.task_id
        const history = payload.history_items ?? []

        // ACK fast — never let downstream work block ClickUp's webhook delivery.
        res.status(200).json({ ok: true })

        try {
            if (event === 'taskCommentPosted') {
                for (const item of history) {
                    if (!item.comment) continue
                    const mentionedIds = extractMentionedUserIds(item.comment)
                    if (mentionedIds.length === 0) continue
                    const map = await profileIdsForClickupUserIds(mentionedIds)
                    if (map.size === 0) continue

                    const meta = taskId ? await fetchTaskMeta(taskId) : {}
                    const senderName = item.comment.user?.username ?? 'Alguém'
                    const commentExcerpt = truncate(item.comment.comment_text ?? '')
                    const title = meta.name
                        ? `${senderName} mencionou você em "${meta.name}"`
                        : `${senderName} mencionou você`

                    for (const profileId of map.values()) {
                        emitToProfile(io, profileId, {
                            kind: 'clickup_mention',
                            title,
                            body: commentExcerpt || undefined,
                            url: meta.url,
                            icon: '💬',
                        })
                    }
                }
                return
            }

            if (event === 'taskAssigneeUpdated' || event === 'taskUpdated') {
                const added = extractAddedAssignees(history)
                if (added.length === 0) return
                const map = await profileIdsForClickupUserIds(added.map((a) => a.id))
                if (map.size === 0) return

                const meta = taskId ? await fetchTaskMeta(taskId) : {}
                const taskName = meta.name ?? 'uma tarefa'
                const assigner = history.find((h) => h.user?.username)?.user?.username

                for (const profileId of map.values()) {
                    emitToProfile(io, profileId, {
                        kind: 'clickup_assigned',
                        title: `Nova tarefa para você: ${taskName}`,
                        body: assigner ? `Atribuída por ${assigner}` : undefined,
                        url: meta.url,
                        icon: '📋',
                    })
                }
                return
            }
        } catch (err) {
            console.error('[clickup-webhook] handler error', err)
        }
    })

    return router
}
