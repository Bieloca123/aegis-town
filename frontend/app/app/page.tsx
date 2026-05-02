import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { Navbar } from '@/components/Navbar/Navbar'
import RealmsMenu from './RealmsMenu/RealmsMenu'
import { getVisitedRealms } from '@/utils/supabase/getVisitedRealms'

// Single-realm mode: when NEXT_PUBLIC_DEFAULT_REALM_ID is set, this page
// redirects straight into the office. Middleware also handles this, but the
// redirect here is a defense-in-depth backup if middleware is bypassed.
//
// If the env var is unset (e.g., during initial setup before pinning the
// office realm), the original realm picker is rendered as a fallback so the
// app stays usable.

export default async function App() {
    const realmId = process.env.NEXT_PUBLIC_DEFAULT_REALM_ID
    if (realmId) {
        return redirect(`/play/${realmId}`)
    }

    const supabase = createClient()

    const { data: { user } } = await supabase.auth.getUser()
    const { data: { session } } = await supabase.auth.getSession()

    if (!user || !session) {
        return redirect('/signin')
    }

    const realms: any = []
    const { data: ownedRealms, error } = await supabase.from('realms').select('id, name, share_id').eq('owner_id', user.id)
    if (ownedRealms) {
        realms.push(...ownedRealms)
    }
    if (session) {
        let { data: visitedRealms, error: visitedRealmsError } = await getVisitedRealms(session.access_token)
        if (visitedRealms) {
            visitedRealms = visitedRealms.map((realm) => ({ ...realm, shared: true }))
            realms.push(...visitedRealms)
        }
    }
    const errorMessage = error?.message || ''

    return (
        <div>
            <Navbar />
            <h1 className='text-3xl font-semibold tracking-tight pl-4 sm:pl-8 pt-8'>Suas Salas</h1>
            <RealmsMenu realms={realms} errorMessage={errorMessage}/>
        </div>
    )
}
