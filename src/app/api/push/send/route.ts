import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { sendPushToMember, broadcastPush } from '@/lib/push'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
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
    .select('id, role')
    .eq('user_id', session.user.id)
    .single()

  if (!member || !['board', 'admin'].includes(member.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { member_id, title, body, url, tag } = await request.json()
  if (!title || !body) {
    return NextResponse.json({ error: 'title and body required' }, { status: 400 })
  }

  const payload = { title, body, url, tag }

  if (member_id) {
    await sendPushToMember(member_id, payload)
  } else {
    await broadcastPush(payload)
  }

  return NextResponse.json({ ok: true })
}
