'use server'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { skinIds } from '@/utils/pixi/Player/skins'

export async function completeOnboarding(formData: FormData) {
    const displayName = String(formData.get('displayName') ?? '').trim()
    const skin = String(formData.get('skin') ?? '').trim()

    if (displayName.length < 2 || displayName.length > 32) {
        return { error: 'O nome precisa ter entre 2 e 32 caracteres.' }
    }
    if (!skinIds.includes(skin)) {
        return { error: 'Avatar inválido.' }
    }

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { error: 'Sessão expirada. Entre novamente.' }
    }

    const { error } = await supabase
        .from('profiles')
        .update({
            display_name: displayName,
            skin: skin,
            onboarding_complete: true,
        })
        .eq('id', user.id)

    if (error) {
        return { error: error.message }
    }

    const realmId = process.env.NEXT_PUBLIC_DEFAULT_REALM_ID
    redirect(realmId ? `/play/${realmId}` : '/app')
}
