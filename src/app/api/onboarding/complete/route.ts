export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function PATCH(req: NextRequest) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { full_name, bio, interests } = body

  if (!full_name || String(full_name).trim().length < 2) {
    return NextResponse.json({ error: 'Display name required' }, { status: 400 })
  }

  // Update core profile fields (never touch avatar_url - Google OAuth sets it via trigger)
  const { error: memberErr } = await supabase
    .from('members')
    .update({
      full_name: String(full_name).trim(),
      bio: bio ? String(bio).trim() : null,
    })
    .eq('id', session.user.id)

  if (memberErr) return NextResponse.json({ error: memberErr.message }, { status: 500 })

  // Best-effort interests update (silently skipped if column not yet migrated)
  if (Array.isArray(interests) && interests.length > 0) {
    await supabase
      .from('members')
      .update({ interests })
      .eq('id', session.user.id)
  }

  // Mark onboarding complete (upsert so it works whether the row exists or not)
  const { error: onboardErr } = await supabase
    .from('member_onboarding_state')
    .upsert({
      member_id: session.user.id,
      step: 'complete',
      completed_at: new Date().toISOString(),
    }, { onConflict: 'member_id' })

  if (onboardErr) return NextResponse.json({ error: onboardErr.message }, { status: 500 })

  return NextResponse.json({ success: true }, { status: 200 })
}
