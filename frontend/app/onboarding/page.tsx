import Image from 'next/image'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import OnboardingForm from './OnboardingForm'
import { defaultSkin } from '@/utils/pixi/Player/skins'

function suggestNameFromEmail(email: string | undefined): string {
    if (!email) return ''
    const [local] = email.split('@')
    if (!local) return ''
    const cleaned = local.replace(/[._]+/g, ' ').replace(/\d+/g, '').trim()
    if (!cleaned) return ''
    return cleaned
        .split(/\s+/)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ')
}

export default async function Onboarding() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return redirect('/signin')
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('is_member, onboarding_complete, display_name, skin')
        .eq('id', user.id)
        .single()

    if (!profile?.is_member) {
        return redirect('/welcome')
    }

    if (profile.onboarding_complete) {
        const realmId = process.env.NEXT_PUBLIC_DEFAULT_REALM_ID
        return redirect(realmId ? `/play/${realmId}` : '/app')
    }

    const suggestedName = profile.display_name || suggestNameFromEmail(user.email)
    const initialSkin = profile.skin || defaultSkin

    return (
        <div className='flex flex-col items-center w-full min-h-screen pt-16 px-4 pb-16 gradient'>
            <Image
                src='/brand/athena-mark-light.png'
                alt='Athena Growth'
                width={72}
                height={72}
                priority
                className='mb-4 opacity-95'
            />
            <h1 className='text-2xl font-semibold tracking-tight mb-1'>Bem-vindo!</h1>
            <p className='text-sm opacity-70 mb-8 max-w-md text-center'>
                Antes de entrar no escritório, escolha como o time vai te ver.
            </p>
            <OnboardingForm initialName={suggestedName} initialSkin={initialSkin} />
        </div>
    )
}
