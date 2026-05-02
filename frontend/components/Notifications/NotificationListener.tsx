'use client'
import { useEffect } from 'react'
import { toast } from 'react-toastify'
import { server } from '@/utils/backend/server'

type NotificationPayload = {
    kind: string          // 'clickup_mention' | 'calendar_reminder' | etc.
    title: string
    body?: string
    url?: string
    icon?: string         // optional emoji prefix
}

const KIND_DEFAULT_ICON: Record<string, string> = {
    clickup_mention: '💬',
    calendar_reminder: '📅',
    n8n_alert: '⚡',
}

export default function NotificationListener() {
    useEffect(() => {
        function handler(payload: NotificationPayload) {
            const icon = payload.icon ?? KIND_DEFAULT_ICON[payload.kind] ?? '🔔'
            const content = (
                <div className='flex flex-col gap-0.5'>
                    <span className='font-semibold text-sm'>
                        {icon} {payload.title}
                    </span>
                    {payload.body && (
                        <span className='text-xs opacity-80 line-clamp-3'>{payload.body}</span>
                    )}
                </div>
            )
            const onClick = payload.url
                ? () => window.open(payload.url, '_blank', 'noopener,noreferrer')
                : undefined

            toast(content, {
                autoClose: 8000,
                onClick,
                closeOnClick: false,
                style: payload.url ? { cursor: 'pointer' } : undefined,
                position: 'top-right',
            })
        }

        // server.socket may not be a real Socket yet if this component mounts
        // before connection completes — guard with optional chaining.
        const sock = server.socket
        if (!sock || typeof sock.on !== 'function') return

        sock.on('notification', handler)
        return () => {
            sock.off('notification', handler)
        }
    }, [])

    return null
}
