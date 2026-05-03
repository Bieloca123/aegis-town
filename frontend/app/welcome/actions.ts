'use server'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { timingSafeEqual } from 'crypto'

function safeEqual(a: string, b: string): boolean {
    const ab = Buffer.from(a)
    const bb = Buffer.from(b)
    if (ab.length !== bb.length) return false
    return timingSafeEqual(ab, bb)
}

export async function verifyAccessCode(formData: FormData) {
    const code = String(formData.get('code') ?? '').trim()
    const expected = process.env.ATHENA_ACCESS_CODE

    if (!expected) {
        return { error: 'Access is not configured. Contact an administrator.' }
    }
    if (!code) {
        return { error: 'Please enter the access code.' }
    }
    if (!safeEqual(code, expected)) {
        return { error: 'Invalid access code.' }
    }

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { error: 'You must sign in first.' }
    }

    const { error } = await supabase
        .from('profiles')
        .update({ is_member: true })
        .eq('id', user.id)

    if (error) {
        return { error: error.message }
    }

    redirect('/app')
}
