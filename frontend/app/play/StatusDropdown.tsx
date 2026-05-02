'use client'
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import signal from '@/utils/signal'

export type Status = 'available' | 'busy' | 'dnd'

const LABEL: Record<Status, string> = {
    available: 'Disponível',
    busy: 'Ocupado',
    dnd: 'Não perturbe',
}

const DOT: Record<Status, string> = {
    available: 'bg-green-500',
    busy: 'bg-yellow-500',
    dnd: 'bg-red-500',
}

const ORDER: Status[] = ['available', 'busy', 'dnd']

type Props = {
    initialStatus: Status
}

export default function StatusDropdown({ initialStatus }: Props) {
    const [status, setStatus] = useState<Status>(initialStatus)
    const [open, setOpen] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)

    // Broadcast the initial value once so Player.ts (and anyone else listening)
    // knows the local user's status before the user has interacted with the dropdown.
    useEffect(() => {
        signal.emit('local-status', initialStatus)
    }, [initialStatus])

    // Close on outside click
    useEffect(() => {
        if (!open) return
        const onDocClick = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false)
            }
        }
        document.addEventListener('mousedown', onDocClick)
        return () => document.removeEventListener('mousedown', onDocClick)
    }, [open])

    async function applyStatus(next: Status) {
        setStatus(next)
        setOpen(false)
        signal.emit('local-status', next)
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        await supabase.from('profiles').update({ status: next }).eq('id', user.id)
    }

    return (
        <div ref={containerRef} className='relative'>
            <button
                onClick={() => setOpen(!open)}
                className='flex flex-row items-center gap-1.5 text-[#BDBDBD] text-xs hover:text-white animate-colors'
                title='Status'
            >
                <span className={`w-2 h-2 rounded-full ${DOT[status]}`} />
                {LABEL[status]}
            </button>
            {open && (
                <div className='absolute bottom-full left-0 mb-1 bg-secondary rounded-lg shadow-lg p-1 z-30 min-w-[160px] border border-light-gray/40'>
                    {ORDER.map((s) => (
                        <button
                            key={s}
                            onClick={() => applyStatus(s)}
                            className={`w-full text-left px-2 py-1.5 rounded text-xs flex flex-row items-center gap-2 hover:bg-light-secondary animate-colors ${
                                status === s ? 'bg-light-secondary' : ''
                            }`}
                        >
                            <span className={`w-2 h-2 rounded-full ${DOT[s]}`} />
                            {LABEL[s]}
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}
