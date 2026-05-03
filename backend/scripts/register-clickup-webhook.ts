// One-time registration of the ClickUp webhook that fires our
// POST /webhooks/clickup endpoint. ClickUp generates and returns a per-webhook
// secret which must then be set as CLICKUP_WEBHOOK_SECRET in the backend env
// (Railway prod + local .env) for signature verification to work.
//
// Run:
//   npx ts-node backend/scripts/register-clickup-webhook.ts register https://aegis.example.com
//   npx ts-node backend/scripts/register-clickup-webhook.ts list
//
// Env required: CLICKUP_API_TOKEN, CLICKUP_TEAM_ID

import 'dotenv/config'

const SUBSCRIBED_EVENTS = ['taskCommentPosted', 'taskAssigneeUpdated']

type ClickupWebhook = {
    id: string
    endpoint: string
    events: string[] | '*'
    secret?: string
}

function requireEnv(name: string): string {
    const v = process.env[name]
    if (!v) {
        console.error(`Missing required env var: ${name}`)
        process.exit(1)
    }
    return v
}

async function clickup<T>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> {
    const token = requireEnv('CLICKUP_API_TOKEN')
    const res = await fetch(`https://api.clickup.com/api/v2${path}`, {
        method,
        headers: {
            Authorization: token,
            ...(body ? { 'Content-Type': 'application/json' } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
    })
    const text = await res.text()
    if (!res.ok) {
        console.error(`ClickUp ${method} ${path} → ${res.status}\n${text}`)
        process.exit(1)
    }
    return JSON.parse(text) as T
}

async function register(publicUrl: string) {
    const teamId = requireEnv('CLICKUP_TEAM_ID')
    const endpoint = `${publicUrl.replace(/\/$/, '')}/webhooks/clickup`

    const result = await clickup<{ id?: string; webhook?: ClickupWebhook }>(
        'POST',
        `/team/${teamId}/webhook`,
        { endpoint, events: SUBSCRIBED_EVENTS },
    )

    const webhook = result.webhook ?? (result as unknown as ClickupWebhook)
    console.log('\n✓ Webhook registered.')
    console.log(`   id:       ${webhook.id}`)
    console.log(`   endpoint: ${webhook.endpoint}`)
    console.log(`   events:   ${Array.isArray(webhook.events) ? webhook.events.join(', ') : webhook.events}`)
    if (webhook.secret) {
        console.log('\n→ Add this to backend env (Railway + local .env):')
        console.log(`   CLICKUP_WEBHOOK_SECRET=${webhook.secret}`)
    } else {
        console.log('\n⚠ ClickUp did not return a secret in the response. Check the dashboard:')
        console.log('   https://app.clickup.com/settings/team/{team_id}/integrations')
    }
}

async function list() {
    const teamId = requireEnv('CLICKUP_TEAM_ID')
    const result = await clickup<{ webhooks?: ClickupWebhook[] }>('GET', `/team/${teamId}/webhook`)
    const hooks = result.webhooks ?? []
    if (hooks.length === 0) {
        console.log('No webhooks registered for this team.')
        return
    }
    for (const h of hooks) {
        console.log(`- ${h.id}  ${h.endpoint}  [${Array.isArray(h.events) ? h.events.join(',') : h.events}]`)
    }
}

async function main() {
    const [, , cmd, arg] = process.argv
    if (cmd === 'register') {
        if (!arg) {
            console.error('Usage: register-clickup-webhook.ts register <public-aegis-url>')
            process.exit(1)
        }
        await register(arg)
        return
    }
    if (cmd === 'list') {
        await list()
        return
    }
    console.error('Usage:')
    console.error('  register-clickup-webhook.ts register <public-aegis-url>')
    console.error('  register-clickup-webhook.ts list')
    process.exit(1)
}

main()
