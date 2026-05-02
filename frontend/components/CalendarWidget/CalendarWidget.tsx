'use client'
import React, { useEffect, useState } from 'react'
import { CalendarBlank, VideoCamera, MapPin } from '@phosphor-icons/react'
import { fetchUpcomingEvents, formatRelative, type CalendarEvent } from '@/utils/google/calendar'

const REFRESH_INTERVAL_MS = 5 * 60 * 1000 // 5 minutes
const COUNTDOWN_TICK_MS = 30 * 1000 // 30s — keeps the "em N min" label fresh

const CalendarWidget: React.FC = () => {
    const [events, setEvents] = useState<CalendarEvent[]>([])
    const [open, setOpen] = useState(false)
    const [_, setTick] = useState(0)
    const [loaded, setLoaded] = useState(false)

    useEffect(() => {
        let cancelled = false
        async function load() {
            const data = await fetchUpcomingEvents(5)
            if (!cancelled) {
                setEvents(data)
                setLoaded(true)
            }
        }
        load()
        const refresh = setInterval(load, REFRESH_INTERVAL_MS)
        const countdown = setInterval(() => setTick((t) => t + 1), COUNTDOWN_TICK_MS)
        return () => {
            cancelled = true
            clearInterval(refresh)
            clearInterval(countdown)
        }
    }, [])

    // Hide widget entirely if calendar access isn't granted (empty after a load)
    // — UX is "calendar is just absent" rather than "broken empty button"
    if (loaded && events.length === 0) return null

    const next = events[0]

    return (
        <div className='relative hidden lg:block'>
            <button
                onClick={() => setOpen(!open)}
                className='flex flex-row items-center gap-2 px-3 h-12 rounded-lg bg-secondary hover:bg-light-secondary animate-colors text-left max-w-[280px]'
                title='Próximas reuniões'
            >
                <CalendarBlank size={18} className='flex-shrink-0 opacity-70' />
                {!loaded ? (
                    <span className='text-xs opacity-50'>Carregando agenda…</span>
                ) : next ? (
                    <div className='flex flex-col leading-tight overflow-hidden'>
                        <span className='text-xs font-medium truncate max-w-[200px]'>{next.summary}</span>
                        <span className='text-[10px] opacity-60'>{formatRelative(next.start)}</span>
                    </div>
                ) : null}
            </button>

            {open && events.length > 0 && (
                <div className='absolute bottom-full right-0 mb-1 bg-secondary rounded-lg shadow-lg p-2 z-30 min-w-[320px] border border-light-gray/40'>
                    <p className='text-[11px] uppercase tracking-wider opacity-60 px-1 pb-2'>Próximas reuniões</p>
                    <div className='flex flex-col gap-1'>
                        {events.map((e) => (
                            <a
                                key={e.id}
                                href={e.htmlLink}
                                target='_blank'
                                rel='noopener noreferrer'
                                className='flex flex-col gap-0.5 px-2 py-1.5 rounded hover:bg-light-secondary animate-colors'
                            >
                                <div className='flex flex-row items-center justify-between gap-2'>
                                    <span className='text-xs font-medium truncate'>{e.summary}</span>
                                    <span className='text-[10px] opacity-60 flex-shrink-0'>{formatRelative(e.start)}</span>
                                </div>
                                <div className='flex flex-row items-center gap-3 text-[10px] opacity-60'>
                                    {e.isAllDay ? (
                                        <span>Dia inteiro</span>
                                    ) : (
                                        <span>
                                            {e.start.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                            {' – '}
                                            {e.end.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    )}
                                    {e.hangoutLink && (
                                        <span className='flex flex-row items-center gap-1'>
                                            <VideoCamera size={10} /> Meet
                                        </span>
                                    )}
                                    {e.location && !e.hangoutLink && (
                                        <span className='flex flex-row items-center gap-1 truncate'>
                                            <MapPin size={10} /> {e.location}
                                        </span>
                                    )}
                                </div>
                            </a>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

export default CalendarWidget
