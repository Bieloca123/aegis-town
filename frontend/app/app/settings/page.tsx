import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { Navbar } from '@/components/Navbar/Navbar'
import { fetchClickupMembers } from '@/utils/clickup/actions'
import ClickupSettingsCard from './ClickupSettingsCard'

export default async function SettingsPage() {
    const supabase = createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return redirect('/signin')

    const { data: profile } = await supabase
        .from('profiles')
        .select('clickup_user_id, clickup_username, clickup_linked_at')
        .eq('id', user.id)
        .single()

    const rosterResult = await fetchClickupMembers()
    const members = 'members' in rosterResult ? rosterResult.members : []
    const fetchError =
        'error' in rosterResult
            ? rosterResult.detail
                ? `${rosterResult.error} (${rosterResult.detail})`
                : rosterResult.error
            : undefined

    return (
        <div>
            <Navbar />
            <div className='max-w-2xl mx-auto px-4 sm:px-8 pt-8 pb-16'>
                <h1 className='text-3xl font-semibold tracking-tight mb-2'>Configurações</h1>
                <p className='text-sm opacity-70 mb-8'>
                    Gerencie as integrações que enviam notificações para o Aegis.
                </p>

                <h2 className='text-lg font-semibold mb-3'>Integrações</h2>
                <ClickupSettingsCard
                    aegisEmail={user.email ?? ''}
                    members={members}
                    fetchError={fetchError}
                    currentLink={
                        profile?.clickup_user_id
                            ? {
                                  clickup_user_id: Number(profile.clickup_user_id),
                                  clickup_username: profile.clickup_username ?? '',
                                  clickup_linked_at: profile.clickup_linked_at ?? null,
                              }
                            : null
                    }
                />
            </div>
        </div>
    )
}
