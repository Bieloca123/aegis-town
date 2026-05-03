'use client'
import { useState, useTransition } from 'react'
import BasicButton from '@/components/BasicButton'
import AnimatedCharacter from '../play/SkinMenu/AnimatedCharacter'
import { skins } from '@/utils/pixi/Player/skins'
import { completeOnboarding, completeOnboardingWithClickup } from './actions'
import ClickupIdentityPicker, {
    type ClickupMember,
    type LinkResult,
} from '@/components/ClickupIdentityPicker/ClickupIdentityPicker'

type Props = {
    initialName: string
    initialSkin: string
    aegisEmail: string
    clickupMembers: ClickupMember[]
    clickupFetchError?: string
}

export default function OnboardingForm({
    initialName,
    initialSkin,
    aegisEmail,
    clickupMembers,
    clickupFetchError,
}: Props) {
    const [step, setStep] = useState<1 | 2 | 3>(1)
    const [name, setName] = useState(initialName)
    const [skin, setSkin] = useState(initialSkin)
    const [error, setError] = useState('')
    const [pending, startTransition] = useTransition()

    function next() {
        const trimmed = name.trim()
        if (trimmed.length < 2 || trimmed.length > 32) {
            setError('O nome precisa ter entre 2 e 32 caracteres.')
            return
        }
        setError('')
        setStep(2)
    }

    function skipClickupAndFinish() {
        setError('')
        const fd = new FormData()
        fd.set('displayName', name.trim())
        fd.set('skin', skin)
        startTransition(async () => {
            const result = await completeOnboarding(fd)
            if (result?.error) setError(result.error)
        })
    }

    async function linkClickupAndFinish(clickupUserId: number): Promise<LinkResult> {
        return completeOnboardingWithClickup({
            displayName: name.trim(),
            skin,
            clickupUserId,
        })
    }

    if (step === 1) {
        return (
            <div className='flex flex-col items-center gap-3 w-full max-w-sm'>
                <label className='text-sm opacity-70 self-start'>Como você quer aparecer?</label>
                <input
                    name='displayName'
                    type='text'
                    autoFocus
                    maxLength={32}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder='Ex.: Gabriel Freitas'
                    className='w-full px-4 py-3 rounded-lg bg-black/30 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-white/30'
                />
                <p className='text-xs opacity-50 self-start'>{name.trim().length}/32</p>
                <BasicButton onClick={next} className='w-full mt-2'>
                    Próximo
                </BasicButton>
                {error && <p className='text-sm text-red-400 mt-1 text-center'>{error}</p>}
            </div>
        )
    }

    if (step === 2) {
        return (
            <div className='flex flex-col items-center gap-4 w-full max-w-3xl'>
                <div className='flex flex-row items-center gap-4 mb-2'>
                    <AnimatedCharacter src={`/sprites/characters/Character_${skin}.png`} className='!w-24' />
                    <div className='text-left'>
                        <p className='text-lg font-semibold'>{name}</p>
                        <p className='text-xs opacity-60'>Avatar #{skin}</p>
                    </div>
                </div>
                <p className='text-sm opacity-70'>Escolha seu avatar</p>
                <div className='grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-2 max-h-[50vh] overflow-y-auto p-2 rounded-lg bg-black/20 w-full'>
                    {skins.map((s) => (
                        <button
                            key={s.id}
                            type='button'
                            onClick={() => setSkin(s.id)}
                            className={`relative rounded-md p-1 transition-all ${
                                skin === s.id
                                    ? 'ring-2 ring-white bg-white/10'
                                    : 'hover:bg-white/5 ring-1 ring-transparent'
                            }`}
                            title={s.name ?? `Avatar ${s.id}`}
                        >
                            <AnimatedCharacter
                                src={`/sprites/characters/Character_${s.id}.png`}
                                noAnimation
                                className='!w-full'
                            />
                        </button>
                    ))}
                </div>
                <div className='flex flex-row gap-2 w-full max-w-sm mt-2'>
                    <BasicButton
                        onClick={() => setStep(1)}
                        className='flex-1 !bg-transparent !border !border-white/20'
                    >
                        Voltar
                    </BasicButton>
                    <BasicButton onClick={() => setStep(3)} className='flex-1'>
                        Próximo
                    </BasicButton>
                </div>
                {error && <p className='text-sm text-red-400 text-center'>{error}</p>}
            </div>
        )
    }

    return (
        <div className='flex flex-col items-center gap-3 w-full max-w-md'>
            <p className='text-sm opacity-70 text-center'>
                Para você receber menções e tarefas do ClickUp aqui no Aegis, confirme qual usuário
                é você no workspace do time.
            </p>
            <ClickupIdentityPicker
                members={clickupMembers}
                aegisEmail={aegisEmail}
                fetchError={clickupFetchError}
                onLink={linkClickupAndFinish}
                onSkip={skipClickupAndFinish}
                skipLabel={pending ? 'Finalizando…' : 'Pular por agora'}
                confirmLabel='Confirmar e entrar'
            />
            <button
                type='button'
                onClick={() => setStep(2)}
                className='text-xs opacity-60 hover:opacity-90 mt-1'
            >
                ← Voltar para avatar
            </button>
            {error && <p className='text-sm text-red-400 text-center'>{error}</p>}
        </div>
    )
}
