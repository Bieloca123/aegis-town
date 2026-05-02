'use client'
import { createClient } from '@/utils/supabase/client'

export type CalendarEvent = {
    id: string
    summary: string
    start: Date
    end: Date
    isAllDay: boolean
    htmlLink: string
    location?: string
    hangoutLink?: string
}

type RawEvent = {
    id: string
    summary?: string
    start?: { dateTime?: string; date?: string; timeZone?: string }
    end?: { dateTime?: string; date?: string }
    htmlLink?: string
    location?: string
    hangoutLink?: string
    status?: string
}

/**
 * Fetch the user's upcoming Google Calendar events.
 *
 * Uses the OAuth `provider_token` that Supabase stores on the session after
 * Google sign-in. Requires the OAuth client to have requested the
 * `https://www.googleapis.com/auth/calendar.readonly` scope at sign-in time —
 * users who signed in before the scope was added must sign out + back in
 * for `provider_token` to grant calendar access.
 *
 * Returns an empty array on any failure (no token, scope missing, network)
 * so the widget degrades silently instead of breaking the navbar.
 */
export async function fetchUpcomingEvents(maxResults = 5): Promise<CalendarEvent[]> {
    try {
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()
        const accessToken = session?.provider_token
        if (!accessToken) return []

        const now = new Date().toISOString()
        const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events')
        url.searchParams.set('timeMin', now)
        url.searchParams.set('maxResults', String(maxResults))
        url.searchParams.set('singleEvents', 'true')
        url.searchParams.set('orderBy', 'startTime')

        const res = await fetch(url.toString(), {
            headers: { Authorization: `Bearer ${accessToken}` },
        })
        if (!res.ok) return []

        const json = await res.json()
        const items: RawEvent[] = json.items ?? []

        return items
            .filter((e) => e.status !== 'cancelled')
            .map((e): CalendarEvent => {
                const startStr = e.start?.dateTime ?? e.start?.date
                const endStr = e.end?.dateTime ?? e.end?.date
                return {
                    id: e.id,
                    summary: e.summary ?? '(sem título)',
                    start: startStr ? new Date(startStr) : new Date(),
                    end: endStr ? new Date(endStr) : new Date(),
                    isAllDay: !e.start?.dateTime,
                    htmlLink: e.htmlLink ?? '#',
                    location: e.location,
                    hangoutLink: e.hangoutLink,
                }
            })
    } catch {
        return []
    }
}

/**
 * Format the gap between `now` and a future date as "em 12 min" / "em 1h 30min" / "agora".
 * Returns "Em andamento" when `from` < `now`.
 */
export function formatRelative(target: Date, now: Date = new Date()): string {
    const diffMs = target.getTime() - now.getTime()
    if (diffMs <= 0) return 'Em andamento'

    const totalMinutes = Math.round(diffMs / 60_000)
    if (totalMinutes < 1) return 'agora'
    if (totalMinutes < 60) return `em ${totalMinutes} min`

    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60
    if (hours < 24) {
        return minutes === 0 ? `em ${hours}h` : `em ${hours}h ${minutes}min`
    }
    const days = Math.floor(hours / 24)
    return days === 1 ? 'amanhã' : `em ${days} dias`
}
