import Image from 'next/image'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import WelcomeForm from './WelcomeForm'

export default async function Welcome() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return redirect('/signin')
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('is_member')
        .eq('id', user.id)
        .single()

    if (profile?.is_member) {
        const realmId = process.env.NEXT_PUBLIC_DEFAULT_REALM_ID
        return redirect(realmId ? `/play/${realmId}` : '/app')
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
            <h1 className='text-2xl font-semibold tracking-tight mb-2'>Quase lá</h1>
            <p className='text-sm opacity-70 mb-8 max-w-sm text-center'>
                Digite o código de acesso da Athena para entrar na sala. Você só precisa fazer isso uma vez.
            </p>
            <WelcomeForm />
            <p className='mt-8 text-xs opacity-50'>
                Conectado como <span className='font-mono'>{user.email}</span>
            </p>
        </div>
    )
}
