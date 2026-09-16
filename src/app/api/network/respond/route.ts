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

  const body = await req.json().catch(() => ({}))
  const { connection_id, status } = body

  if (!connection_id || !['accepted', 'declined'].includes(status)) {
    return NextResponse.json({ error: 'connection_id and status (accepted|declined) required' }, { status: 400 })
  }

  const { data: conn } = await supabase
    .from('member_connections')
    .select('id, to_member_id')
    .eq('id', connection_id)
    .eq('to_member_id', member.id)
    .eq('status', 'pending')
    .maybeSingle()

  if (!conn) return NextResponse.json({ error: 'Connection not found or not pending' }, { status: 404 })

  await supabase
    .from('member_connections')
    .update({ status })
    .eq('id', connection_id)

  return NextResponse.json({ ok: true, status })
}
