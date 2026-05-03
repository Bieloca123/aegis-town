// One-shot admin script: deletes every row in public.realms using the
// service-role key (bypasses RLS). Lists what's about to be deleted first.
//
// Usage:
//   npx ts-node backend/scripts/delete-all-realms.ts

import * as path from 'path'
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') })

import { createClient } from '@supabase/supabase-js'

async function main() {
    if (!process.env.SUPABASE_URL || !process.env.SERVICE_ROLE) {
        console.error('SUPABASE_URL and SERVICE_ROLE must be set in backend/.env')
        process.exit(1)
    }
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SERVICE_ROLE)

    const { data: before, error: listErr } = await supabase
        .from('realms')
        .select('id, name, owner_id, created_at')
        .order('created_at', { ascending: true })
    if (listErr) {
        console.error('List failed:', listErr.message)
        process.exit(1)
    }

    console.log(`Found ${before?.length ?? 0} realm(s):`)
    for (const r of before ?? []) {
        console.log(`  ${r.id}  ${r.name}  (owner=${r.owner_id}, created=${r.created_at})`)
    }
    if (!before || before.length === 0) {
        console.log('Nothing to delete.')
        return
    }

    const { error: delErr } = await supabase
        .from('realms')
        .delete()
        .gte('created_at', '1970-01-01')
    if (delErr) {
        console.error('Delete failed:', delErr.message)
        process.exit(1)
    }

    const { count, error: countErr } = await supabase
        .from('realms')
        .select('*', { count: 'exact', head: true })
    if (countErr) {
        console.error('Verify count failed:', countErr.message)
        process.exit(1)
    }
    console.log(`Deleted. Remaining realms: ${count ?? 0}.`)
}

main().catch(err => {
    console.error(err)
    process.exit(1)
})
