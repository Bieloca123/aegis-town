'use server'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { skinIds } from '@/utils/pixi/Player/skins'
import { linkClickupIdentity } from '@/utils/clickup/actions'
import type { LinkResult } from '@/components/ClickupIdentityPicker/ClickupIdentityPicker'

function validateProfile(displayName: string, skin: string) {
    if (displayName.length < 2 || displayName.length > 32) {
        return 'O nome precisa ter entre 2 e 32 caracteres.'
    }
    if (!skinIds.includes(skin)) {
        return 'Avatar inválido.'
    }
    return null
}

async function saveProfileBasics(displayName: string, skin: string) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Sessão expirada. Entre novamente.' }

    const { error } = await supabase
        .from('profiles')
        .update({
            display_name: displayName,
            skin,
            onboarding_complete: true,
        })
        .eq('id', user.id)

    if (error) return { error: error.message }
    return { ok: true as const }
}

// Skip-link path: user opted not to link ClickUp during onboarding.
export async function completeOnboarding(formData: FormData) {
    const displayName = String(formData.get('displayName') ?? '').trim()
    const skin = String(formData.get('skin') ?? '').trim()

    const validationError = validateProfile(displayName, skin)
    if (validationError) return { error: validationError }

    const result = await saveProfileBasics(displayName, skin)
    if ('error' in result) return result

    redirect('/app')
}

// Link-and-complete path: user picked themselves from ClickUp roster.
// Returns LinkResult shape so the picker can show the right PT-BR error
// without redirecting on validation failure.
export async function completeOnboardingWithClickup(args: {
    displayName: string
    skin: string
    clickupUserId: number
}): Promise<LinkResult> {
    const displayName = args.displayName.trim()
    const skin = args.skin.trim()

    const validationError = validateProfile(displayName, skin)
    if (validationError) return { error: 'unknown', detail: validationError }

    // Try the ClickUp link first — if it fails, leave profile untouched so
    // the user can fix their ClickUp Gmail and retry without losing state.
    const linkResult = await linkClickupIdentity(args.clickupUserId)
    if ('error' in linkResult) return linkResult

    const saved = await saveProfileBasics(displayName, skin)
    if ('error' in saved) return { error: 'unknown', detail: saved.error }

    redirect('/app')
}
