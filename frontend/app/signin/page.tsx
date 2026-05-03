'use client'
import Image from 'next/image'
import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import GoogleSignInButton from './GoogleSignInButton'

export default function Login() {
    const [email, setEmail] = useState('')
    const [sending, setSending] = useState(false)
    const [sent, setSent] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const signInWithGoogle = async () => {
        const supabase = createClient()
        await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: process.env.NEXT_PUBLIC_BASE_URL + '/auth/callback',
                // Request read-only access to the user's primary calendar so
                // the in-app CalendarWidget can show their next meetings.
                // access_type:'offline' + prompt:'consent' ensures Google
                // issues a refresh token so Supabase can keep provider_token
                // alive across sessions.
                scopes: 'https://www.googleapis.com/auth/calendar.readonly',
                queryParams: {
                    access_type: 'offline',
                    prompt: 'consent',
                },
            }
        })
    }

    const sendMagicLink = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!email) return
        setSending(true)
        setError(null)
        const supabase = createClient()
        const { error } = await supabase.auth.signInWithOtp({
            email,
            options: {
                emailRedirectTo: process.env.NEXT_PUBLIC_BASE_URL + '/auth/callback',
            },
        })
        setSending(false)
        if (error) {
            setError(error.message)
            return
        }
        setSent(true)
    }

    return (
        <div className='flex flex-col items-center w-full min-h-screen pt-32 px-4 gradient'>
            <Image
              src='/brand/athena-mark-light.png'
              alt='Athena Growth'
              width={96}
              height={96}
              priority
              className='mb-6 opacity-95'
            />
            <h1 className='text-2xl font-semibold tracking-tight mb-2'>Athena Growth · Sales Hub</h1>
            <p className='text-sm opacity-70 mb-10'>Entre com sua conta Google da agência</p>

            <GoogleSignInButton onClick={signInWithGoogle}/>

            <div className='flex items-center w-64 my-8 opacity-60'>
                <div className='flex-1 h-px bg-current' />
                <span className='px-3 text-xs uppercase tracking-wider'>ou</span>
                <div className='flex-1 h-px bg-current' />
            </div>

            {sent ? (
                <div className='w-64 text-center text-sm opacity-80'>
                    Enviamos um link de acesso para <strong>{email}</strong>. Confira sua caixa de entrada (e o spam).
                </div>
            ) : (
                <form onSubmit={sendMagicLink} className='w-64 flex flex-col gap-2'>
                    <input
                        type='email'
                        required
                        placeholder='seu@email.com'
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className='h-12 px-3 rounded-md bg-white/10 border border-white/20 text-sm text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30'
                    />
                    <button
                        type='submit'
                        disabled={sending || !email}
                        className='h-12 rounded-md bg-white/15 hover:bg-white/25 disabled:opacity-50 transition text-sm'
                    >
                        {sending ? 'Enviando...' : 'Entrar por email (magic link)'}
                    </button>
                    {error && <p className='text-xs text-red-300'>{error}</p>}
                </form>
            )}
        </div>
    );
}
