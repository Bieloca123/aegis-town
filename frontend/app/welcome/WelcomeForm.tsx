'use client'
import { useState, useTransition } from 'react'
import BasicButton from '@/components/BasicButton'
import { verifyAccessCode } from './actions'

export default function WelcomeForm() {
    const [error, setError] = useState<string>('')
    const [pending, startTransition] = useTransition()

    function onSubmit(formData: FormData) {
        setError('')
        startTransition(async () => {
            const result = await verifyAccessCode(formData)
            if (result?.error) {
                setError(result.error)
            }
        })
    }

    return (
        <form action={onSubmit} className='flex flex-col items-center gap-3 w-full max-w-xs'>
            <input
                name='code'
                type='password'
                autoComplete='off'
                autoFocus
                placeholder='Código de acesso'
                className='w-full px-4 py-3 rounded-lg bg-black/30 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-white/30 text-center tracking-widest'
                disabled={pending}
            />
            <BasicButton disabled={pending} className='w-full'>
                {pending ? 'Verificando…' : 'Entrar'}
            </BasicButton>
            {error && <p className='text-sm text-red-400 mt-1 text-center'>{error}</p>}
        </form>
    )
}
