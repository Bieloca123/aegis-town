'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import BasicButton from '@/components/BasicButton'
import ClickupIdentityPicker, {
    type ClickupMember,
    type LinkResult,
} from '@/components/ClickupIdentityPicker/ClickupIdentityPicker'
import { linkClickupIdentity, unlinkClickupIdentity } from '@/utils/clickup/actions'

type CurrentLink = {
    clickup_user_id: number
    clickup_username: string
    clickup_linked_at: string | null
}

type Props = {
    aegisEmail: string
    members: ClickupMember[]
    fetchError?: string
    currentLink: CurrentLink | null
}

export default function ClickupSettingsCard({ aegisEmail, members, fetchError, currentLink }: Props) {
    const router = useRouter()
    const [editing, setEditing] = useState(false)
    const [pending, startTransition] = useTransition()
    const [unlinkError, setUnlinkError] = useState<string | null>(null)

    function handleLink(clickupUserId: number): Promise<LinkResult> {
        return new Promise((resolve) => {
            startTransition(async () => {
                const result = await linkClickupIdentity(clickupUserId)
                if ('ok' in result) {
                    setEditing(false)
                    router.refresh()
                }
                resolve(result)
            })
        })
    }

    function handleUnlink() {
        setUnlinkError(null)
        startTransition(async () => {
            const result = await unlinkClickupIdentity()
            if ('error' in result) {
                setUnlinkError(result.error)
            } else {
                router.refresh()
            }
        })
    }

    return (
        <div className='rounded-lg bg-black/20 border border-white/10 p-4 sm:p-5'>
            <div className='flex items-start justify-between gap-4 mb-3'>
                <div className='flex items-center gap-3'>
                    <span className='text-2xl'>💬</span>
                    <div>
                        <h3 className='font-semibold'>ClickUp</h3>
                        <p className='text-xs opacity-60'>
                            Receba toasts no Aegis quando você for mencionado em comentários ou
                            atribuído em tarefas.
                        </p>
                    </div>
                </div>
            </div>

            {currentLink && !editing && (
                <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3'>
                    <div className='text-sm'>
                        <p>
                            Vinculado como{' '}
                            <span className='font-semibold'>{currentLink.clickup_username}</span>
                        </p>
                        {currentLink.clickup_linked_at && (
                            <p className='text-xs opacity-60'>
                                desde {new Date(currentLink.clickup_linked_at).toLocaleDateString('pt-BR')}
                            </p>
                        )}
                    </div>
                    <div className='flex gap-2'>
                        <BasicButton
                            onClick={() => setEditing(true)}
                            disabled={pending}
                            className='!py-2 !px-3 !text-xs !bg-transparent !border !border-white/20'
                        >
                            Trocar
                        </BasicButton>
                        <BasicButton
                            onClick={handleUnlink}
                            disabled={pending}
                            className='!py-2 !px-3 !text-xs !bg-red-500/20 hover:!bg-red-500/30'
                        >
                            {pending ? '…' : 'Desvincular'}
                        </BasicButton>
                    </div>
                </div>
            )}

            {(!currentLink || editing) && (
                <div className='mt-2'>
                    <ClickupIdentityPicker
                        members={members}
                        aegisEmail={aegisEmail}
                        currentLinkedId={currentLink?.clickup_user_id}
                        fetchError={fetchError}
                        onLink={handleLink}
                        onSkip={editing ? () => setEditing(false) : undefined}
                        skipLabel='Cancelar'
                        confirmLabel='Salvar'
                    />
                </div>
            )}

            {unlinkError && (
                <p className='text-xs text-red-300 mt-2'>Erro ao desvincular: {unlinkError}</p>
            )}
        </div>
    )
}
