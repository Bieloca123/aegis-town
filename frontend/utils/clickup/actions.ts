'use server'
import { createClient } from '@/utils/supabase/server'
import type { ClickupMember, LinkResult } from '@/components/ClickupIdentityPicker/ClickupIdentityPicker'

async function getAccessToken() {
    const supabase = createClient()
    const { data } = await supabase.auth.getSession()
    return data.session?.access_token ?? null
}

function backendUrl(path: string) {
    const base = process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/$/, '') ?? ''
    return `${base}${path.startsWith('/') ? '' : '/'}${path}`
}

export async function fetchClickupMembers(): Promise<
    { members: ClickupMember[] } | { error: string; detail?: string }
> {
    const token = await getAccessToken()
    if (!token) return { error: 'unauthorized' }

    try {
        const res = await fetch(backendUrl('/clickup/members'), {
            headers: { Authorization: `Bearer ${token}` },
            cache: 'no-store',
        })
        if (!res.ok) {
            const body = await res.json().catch(() => ({}))
            return { error: body.error ?? 'http_error', detail: String(res.status) }
        }
        return (await res.json()) as { members: ClickupMember[] }
    } catch (err) {
        return { error: 'network_error', detail: err instanceof Error ? err.message : undefined }
    }
}

export async function linkClickupIdentity(clickupUserId: number): Promise<LinkResult> {
    const token = await getAccessToken()
    if (!token) return { error: 'unauthorized' }

    try {
        const res = await fetch(backendUrl('/clickup/link'), {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ clickup_user_id: clickupUserId }),
            cache: 'no-store',
        })
        const body = await res.json().catch(() => ({}))
        if (res.ok) return { ok: true, clickup_username: body.clickup_username }
        if (res.status === 422 && body.error === 'email_mismatch') {
            return {
                error: 'email_mismatch',
                clickup_email: body.clickup_email,
                aegis_email: body.aegis_email,
            }
        }
        if (res.status === 409) return { error: 'already_linked' }
        if (res.status === 404) return { error: 'member_not_found' }
        if (res.status === 502) return { error: 'clickup_fetch_failed', detail: body.detail }
        if (res.status === 401) return { error: 'unauthorized' }
        return { error: 'unknown', detail: body.error ?? `http_${res.status}` }
    } catch (err) {
        return { error: 'unknown', detail: err instanceof Error ? err.message : undefined }
    }
}

export async function unlinkClickupIdentity(): Promise<{ ok: true } | { error: string }> {
    const token = await getAccessToken()
    if (!token) return { error: 'unauthorized' }

    try {
        const res = await fetch(backendUrl('/clickup/unlink'), {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            cache: 'no-store',
        })
        if (!res.ok) {
            const body = await res.json().catch(() => ({}))
            return { error: body.error ?? `http_${res.status}` }
        }
        return { ok: true }
    } catch (err) {
        return { error: err instanceof Error ? err.message : 'network_error' }
    }
}
