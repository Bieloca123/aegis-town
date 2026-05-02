'use client'
import React, { useEffect, useRef, useState } from 'react'
import { ChatTeardropDots, X, PaperPlaneRight } from '@phosphor-icons/react'
import { createClient } from '@/utils/supabase/client'
import AnimatedCharacter from '@/app/play/SkinMenu/AnimatedCharacter'

type Message = {
    id: string
    content: string
    created_at: string
    user_id: string
    profiles: {
        display_name: string | null
        skin: string | null
    } | null
}

type Props = {
    realmId: string
    uid: string
}

const ChatPanel: React.FC<Props> = ({ realmId, uid }) => {
    const [open, setOpen] = useState(false)
    const [messages, setMessages] = useState<Message[]>([])
    const [draft, setDraft] = useState('')
    const [unread, setUnread] = useState(0)
    const [sending, setSending] = useState(false)
    const scrollRef = useRef<HTMLDivElement>(null)

    // Initial load + realtime subscription
    useEffect(() => {
        const supabase = createClient()
        let cancelled = false

        async function loadInitial() {
            const { data } = await supabase
                .from('messages')
                .select('id, content, created_at, user_id, profiles(display_name, skin)')
                .eq('realm_id', realmId)
                .order('created_at', { ascending: false })
                .limit(50)
            if (cancelled) return
            const ordered = (data ?? []).slice().reverse() as unknown as Message[]
            setMessages(ordered)
        }
        loadInitial()

        const channel = supabase
            .channel(`messages:${realmId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `realm_id=eq.${realmId}`,
                },
                async (payload) => {
                    const inserted = payload.new as { id: string; content: string; created_at: string; user_id: string }
                    // Realtime payloads don't include joined relations, so fetch the profile
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('display_name, skin')
                        .eq('id', inserted.user_id)
                        .single()
                    setMessages((prev) => {
                        if (prev.some((m) => m.id === inserted.id)) return prev
                        return [...prev, { ...inserted, profiles: profile }]
                    })
                    if (inserted.user_id !== uid) {
                        setUnread((u) => (open ? 0 : u + 1))
                    }
                },
            )
            .subscribe()

        return () => {
            cancelled = true
            supabase.removeChannel(channel)
        }
    }, [realmId, uid, open])

    // Auto-scroll to bottom on new message (when open)
    useEffect(() => {
        if (!open) return
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
    }, [messages, open])

    // Clear unread when opening
    useEffect(() => {
        if (open) setUnread(0)
    }, [open])

    async function send() {
        const trimmed = draft.trim()
        if (!trimmed || sending) return
        if (trimmed.length > 1000) return

        setSending(true)
        const supabase = createClient()
        const { error } = await supabase
            .from('messages')
            .insert({ realm_id: realmId, user_id: uid, content: trimmed })
        if (!error) {
            setDraft('')
        }
        setSending(false)
    }

    function onKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            send()
        }
    }

    return (
        <>
            {!open && (
                <button
                    onClick={() => setOpen(true)}
                    className='fixed bottom-20 right-4 z-30 bg-quaternary hover:bg-quaternaryhover animate-colors text-button rounded-full p-3 shadow-lg flex flex-row items-center gap-2'
                    aria-label='Abrir chat'
                >
                    <ChatTeardropDots size={24} weight='fill' />
                    {unread > 0 && (
                        <span className='absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full min-w-[18px] h-[18px] grid place-items-center px-1'>
                            {unread > 99 ? '99+' : unread}
                        </span>
                    )}
                </button>
            )}

            {open && (
                <div className='fixed top-0 right-0 z-30 h-full w-full sm:w-[360px] bg-secondary border-l border-light-gray/40 flex flex-col shadow-2xl animate-in slide-in-from-right'>
                    <header className='flex flex-row items-center justify-between p-3 border-b border-light-gray/40'>
                        <div className='flex flex-row items-center gap-2'>
                            <ChatTeardropDots size={20} weight='fill' />
                            <h2 className='font-semibold text-sm'>Chat do escritório</h2>
                        </div>
                        <button
                            onClick={() => setOpen(false)}
                            className='hover:bg-light-secondary rounded p-1 animate-colors'
                            aria-label='Fechar chat'
                        >
                            <X size={18} />
                        </button>
                    </header>

                    <div ref={scrollRef} className='flex-1 overflow-y-auto p-3 flex flex-col gap-3'>
                        {messages.length === 0 && (
                            <p className='text-xs opacity-50 text-center py-8'>Sem mensagens ainda. Diga oi! 👋</p>
                        )}
                        {messages.map((m) => (
                            <MessageRow key={m.id} message={m} isMe={m.user_id === uid} />
                        ))}
                    </div>

                    <footer className='p-3 border-t border-light-gray/40'>
                        <div className='flex flex-row items-end gap-2'>
                            <textarea
                                value={draft}
                                onChange={(e) => setDraft(e.target.value)}
                                onKeyDown={onKey}
                                placeholder='Mensagem para o time…'
                                rows={1}
                                maxLength={1000}
                                className='flex-1 resize-none bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-white/30 placeholder-white/40 max-h-32'
                            />
                            <button
                                onClick={send}
                                disabled={!draft.trim() || sending}
                                className='bg-quaternary hover:bg-quaternaryhover animate-colors text-button rounded-lg p-2 disabled:opacity-50 disabled:pointer-events-none'
                                aria-label='Enviar'
                            >
                                <PaperPlaneRight size={18} weight='fill' />
                            </button>
                        </div>
                        <p className='text-[10px] opacity-40 mt-1'>Enter envia · Shift+Enter quebra linha</p>
                    </footer>
                </div>
            )}
        </>
    )
}

function MessageRow({ message, isMe }: { message: Message; isMe: boolean }) {
    const name = message.profiles?.display_name || 'Anônimo'
    const skin = message.profiles?.skin || '009'
    const time = new Date(message.created_at).toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
    })

    return (
        <div className={`flex flex-row gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
            <div className='flex-shrink-0 w-8 h-8 rounded-full bg-black/40 grid place-items-center overflow-hidden'>
                <AnimatedCharacter
                    src={`/sprites/characters/Character_${skin}.png`}
                    noAnimation
                    className='!w-full !h-full'
                />
            </div>
            <div className={`flex flex-col max-w-[78%] ${isMe ? 'items-end' : 'items-start'}`}>
                <div className='flex flex-row items-baseline gap-2'>
                    <span className='text-xs font-semibold opacity-90'>{isMe ? 'Você' : name}</span>
                    <span className='text-[10px] opacity-50'>{time}</span>
                </div>
                <div
                    className={`text-sm rounded-lg px-3 py-1.5 mt-0.5 whitespace-pre-wrap break-words ${
                        isMe ? 'bg-quaternary/60 text-button' : 'bg-light-secondary'
                    }`}
                >
                    {message.content}
                </div>
            </div>
        </div>
    )
}

export default ChatPanel
