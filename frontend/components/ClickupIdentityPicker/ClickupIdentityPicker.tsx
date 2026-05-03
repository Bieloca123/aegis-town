'use client'
import { useMemo, useState, useTransition } from 'react'
import BasicButton from '@/components/BasicButton'

export type ClickupMember = {
    id: number
    username: string
    email: string
    profile_picture: string | null
}

export type LinkResult =
    | { ok: true; clickup_username: string }
    | { error: 'email_mismatch'; clickup_email: string; aegis_email: string }
    | { error: 'already_linked' }
    | { error: 'member_not_found' }
    | { error: 'clickup_fetch_failed'; detail?: string }
    | { error: 'unauthorized' }
    | { error: 'unknown'; detail?: string }

type Props = {
    members: ClickupMember[]
    aegisEmail: string
    currentLinkedId?: number | null
    fetchError?: string
    onLink: (clickup_user_id: number) => Promise<LinkResult>
    onSkip?: () => void
    skipLabel?: string
    confirmLabel?: string
}

function emailMismatchMessage(clickupEmail: string, aegisEmail: string) {
    return (
        <>
            Este usuário do ClickUp está cadastrado com{' '}
            <span className='font-mono'>{clickupEmail}</span>, mas você entrou no Aegis com{' '}
            <span className='font-mono'>{aegisEmail}</span>. Para receber as menções aqui, entre no
            ClickUp com o mesmo Gmail ou peça ao admin do workspace para atualizar seu e-mail.
        </>
    )
}

export default function ClickupIdentityPicker({
    members,
    aegisEmail,
    currentLinkedId,
    fetchError,
    onLink,
    onSkip,
    skipLabel = 'Pular por agora',
    confirmLabel = 'Confirmar identidade',
}: Props) {
    const [query, setQuery] = useState('')
    const [selectedId, setSelectedId] = useState<number | null>(currentLinkedId ?? null)
    const [pending, startTransition] = useTransition()
    const [result, setResult] = useState<LinkResult | null>(null)

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase()
        if (!q) return members
        return members.filter(
            (m) => m.username.toLowerCase().includes(q) || m.email.toLowerCase().includes(q),
        )
    }, [members, query])

    function confirm() {
        if (!selectedId) return
        startTransition(async () => {
            const r = await onLink(selectedId)
            setResult(r)
        })
    }

    if (fetchError) {
        return (
            <div className='flex flex-col items-center gap-3 w-full max-w-md text-center'>
                <p className='text-sm text-red-300'>
                    Não foi possível carregar a lista do ClickUp.
                </p>
                <p className='text-xs opacity-60'>{fetchError}</p>
                {onSkip && (
                    <BasicButton onClick={onSkip} className='mt-2 !bg-transparent !border !border-white/20'>
                        {skipLabel}
                    </BasicButton>
                )}
            </div>
        )
    }

    return (
        <div className='flex flex-col items-center gap-3 w-full max-w-md'>
            <p className='text-sm opacity-70 self-start'>
                Quem é você no ClickUp?{' '}
                <span className='opacity-60'>
                    (logado no Aegis como <span className='font-mono'>{aegisEmail}</span>)
                </span>
            </p>
            <input
                type='text'
                placeholder='Buscar por nome ou e-mail…'
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className='w-full px-4 py-2.5 rounded-lg bg-black/30 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-white/30'
            />
            <div className='flex flex-col gap-1 max-h-[40vh] overflow-y-auto w-full rounded-lg bg-black/20 p-2'>
                {filtered.length === 0 && (
                    <p className='text-xs opacity-60 text-center py-4'>Nenhum membro encontrado.</p>
                )}
                {filtered.map((m) => {
                    const isSelected = m.id === selectedId
                    const emailMatchesAegis = m.email.toLowerCase() === aegisEmail.toLowerCase()
                    return (
                        <button
                            key={m.id}
                            type='button'
                            onClick={() => setSelectedId(m.id)}
                            className={`flex items-center gap-3 p-2 rounded-md text-left transition-colors ${
                                isSelected
                                    ? 'bg-white/15 ring-1 ring-white/30'
                                    : 'hover:bg-white/5'
                            }`}
                        >
                            {m.profile_picture ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={m.profile_picture}
                                    alt=''
                                    className='w-8 h-8 rounded-full'
                                />
                            ) : (
                                <div className='w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs uppercase'>
                                    {m.username.slice(0, 2)}
                                </div>
                            )}
                            <div className='flex flex-col flex-1 min-w-0'>
                                <span className='text-sm font-medium truncate'>{m.username}</span>
                                <span className='text-xs opacity-60 font-mono truncate'>
                                    {m.email}
                                </span>
                            </div>
                            {emailMatchesAegis && (
                                <span className='text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-200 whitespace-nowrap'>
                                    é você
                                </span>
                            )}
                        </button>
                    )
                })}
            </div>

            <div className='flex flex-row gap-2 w-full'>
                {onSkip && (
                    <BasicButton
                        onClick={onSkip}
                        disabled={pending}
                        className='flex-1 !bg-transparent !border !border-white/20'
                    >
                        {skipLabel}
                    </BasicButton>
                )}
                <BasicButton
                    onClick={confirm}
                    disabled={pending || !selectedId}
                    className='flex-1'
                >
                    {pending ? 'Validando…' : confirmLabel}
                </BasicButton>
            </div>

            {result && 'error' in result && (
                <div className='text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg p-3 w-full'>
                    {result.error === 'email_mismatch' &&
                        emailMismatchMessage(result.clickup_email, result.aegis_email)}
                    {result.error === 'already_linked' &&
                        'Esta conta do ClickUp já está vinculada a outro usuário do Aegis. Fale com o admin se isso parece errado.'}
                    {result.error === 'member_not_found' &&
                        'Membro do ClickUp não encontrado. Tente recarregar a lista.'}
                    {result.error === 'clickup_fetch_failed' &&
                        'Falha ao consultar o ClickUp. Tente novamente em alguns segundos.'}
                    {result.error === 'unauthorized' && 'Sessão expirada. Entre novamente.'}
                    {result.error === 'unknown' &&
                        `Erro inesperado${result.detail ? `: ${result.detail}` : ''}.`}
                </div>
            )}
        </div>
    )
}
