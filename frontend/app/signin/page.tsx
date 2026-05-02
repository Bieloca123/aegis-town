'use client'
import Image from 'next/image'
import { createClient } from '@/utils/supabase/client'
import GoogleSignInButton from './GoogleSignInButton'

export default function Login() {

    const signInWithGoogle = async () => {
        const supabase = createClient()
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: process.env.NEXT_PUBLIC_BASE_URL + '/auth/callback'
            }
        })
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
    </div>
  );
}
