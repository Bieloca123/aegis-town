import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { supabase } from '../supabase'

// Identity-link routes between an Aegis profile and a ClickUp workspace member.
//
// Flow:
//   1. GET  /clickup/members  — auth'd user fetches the workspace roster.
//   2. POST /clickup/link     — user picks themselves; server validates that
//      the chosen ClickUp member's email matches auth.users.email and stores
//      the link on profiles.clickup_user_id.
//
// n8n workflows downstream rely on this link to route ClickUp events
// (mentions, assignments) to the right Aegis user via /webhooks/notify.

type ClickupMember = {
    id: number
    username: string
    email: string
    profile_picture: string | null
}

type CachedRoster = { fetchedAt: number; members: ClickupMember[] }
let rosterCache: CachedRoster | null = null
const ROSTER_TTL_MS = 5 * 60 * 1000

async function fetchClickupRoster(): Promise<ClickupMember[]> {
    if (rosterCache && Date.now() - rosterCache.fetchedAt < ROSTER_TTL_MS) {
        return rosterCache.members
    }

    const token = process.env.CLICKUP_API_TOKEN
    const teamId = process.env.CLICKUP_TEAM_ID
    if (!token) throw new Error('CLICKUP_API_TOKEN not configured')

    const res = await fetch('https://api.clickup.com/api/v2/team', {
        headers: { Authorization: token },
    })
    if (!res.ok) {
        throw new Error(`ClickUp /team failed: ${res.status}`)
    }
    const data = (await res.json()) as { teams?: Array<{ id: string; members: Array<{ user: { id: number; username: string; email: string; profilePicture: string | null } }> }> }

    const teams = data.teams ?? []
    const team = teamId ? teams.find((t) => t.id === teamId) : teams[0]
    if (!team) {
        throw new Error(teamId ? `ClickUp team ${teamId} not visible to token` : 'No ClickUp teams visible to token')
    }

    const members: ClickupMember[] = team.members.map((m) => ({
        id: m.user.id,
        username: m.user.username,
        email: m.user.email,
        profile_picture: m.user.profilePicture ?? null,
    }))

    rosterCache = { fetchedAt: Date.now(), members }
    return members
}

async function authedUser(req: Request) {
    const token = req.headers.authorization?.split(' ')[1]
    if (!token) return { error: 'no_token' as const }
    const { data, error } = await supabase.auth.getUser(token)
    if (error || !data.user) return { error: 'invalid_token' as const }
    return { user: data.user }
}

const LinkBody = z.object({ clickup_user_id: z.number().int().positive() })

export function clickupRouter(): Router {
    const router = Router()

    router.get('/clickup/members', async (req: Request, res: Response) => {
        const auth = await authedUser(req)
        if ('error' in auth) return res.status(401).json({ error: auth.error })

        try {
            const members = await fetchClickupRoster()
            return res.json({ members })
        } catch (err) {
            const message = err instanceof Error ? err.message : 'unknown_error'
            return res.status(502).json({ error: 'clickup_fetch_failed', detail: message })
        }
    })

    router.post('/clickup/link', async (req: Request, res: Response) => {
        const auth = await authedUser(req)
        if ('error' in auth) return res.status(401).json({ error: auth.error })

        const parsed = LinkBody.safeParse(req.body)
        if (!parsed.success) {
            return res.status(400).json({ error: 'invalid_body' })
        }

        const aegisEmail = auth.user.email
        if (!aegisEmail) return res.status(400).json({ error: 'no_aegis_email' })

        let members: ClickupMember[]
        try {
            members = await fetchClickupRoster()
        } catch (err) {
            const message = err instanceof Error ? err.message : 'unknown_error'
            return res.status(502).json({ error: 'clickup_fetch_failed', detail: message })
        }

        const member = members.find((m) => m.id === parsed.data.clickup_user_id)
        if (!member) return res.status(404).json({ error: 'member_not_found' })

        if (member.email.toLowerCase() !== aegisEmail.toLowerCase()) {
            return res.status(422).json({
                error: 'email_mismatch',
                clickup_email: member.email,
                aegis_email: aegisEmail,
            })
        }

        const { error: updateError } = await supabase
            .from('profiles')
            .update({
                clickup_user_id: member.id,
                clickup_username: member.username,
                clickup_linked_at: new Date().toISOString(),
            })
            .eq('id', auth.user.id)

        if (updateError) {
            // 23505 = unique_violation → another profile already claimed this clickup_user_id
            if ((updateError as { code?: string }).code === '23505') {
                return res.status(409).json({ error: 'already_linked' })
            }
            return res.status(500).json({ error: 'db_update_failed', detail: updateError.message })
        }

        return res.json({ ok: true, clickup_username: member.username })
    })

    router.post('/clickup/unlink', async (req: Request, res: Response) => {
        const auth = await authedUser(req)
        if ('error' in auth) return res.status(401).json({ error: auth.error })

        const { error } = await supabase
            .from('profiles')
            .update({
                clickup_user_id: null,
                clickup_username: null,
                clickup_linked_at: null,
            })
            .eq('id', auth.user.id)

        if (error) return res.status(500).json({ error: 'db_update_failed', detail: error.message })
        return res.json({ ok: true })
    })

    return router
}
