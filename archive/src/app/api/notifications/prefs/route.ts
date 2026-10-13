import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n) => cookieStore.get(n)?.value } }
  )

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: member } = await supabase
    .from('members')
    .select('id')
    .eq('user_id', session.user.id)
    .single()

  if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 })

  const body = await req.json().catch(() => ({ prefs: [] }))
  const prefs: { channel: string; type: string; enabled: boolean }[] = body.prefs ?? []

  if (!Array.isArray(prefs)) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const rows = prefs.map((p) => ({
    member_id: member.id,
    channel: p.channel,
    type: p.type,
    enabled: p.enabled,
  }))

  await supabase
    .from('notification_preferences')
    .upsert(rows, { onConflict: 'member_id,channel,type' })

  return NextResponse.json({ ok: true })
}
