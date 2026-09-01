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
  const { to_member_id, message } = body

  if (!to_member_id) return NextResponse.json({ error: 'to_member_id required' }, { status: 400 })
  if (to_member_id === member.id) return NextResponse.json({ error: 'Cannot connect to yourself' }, { status: 400 })

  // Check no existing connection
  const { data: existing } = await supabase
    .from('member_connections')
    .select('id, status')
    .or(
      `and(from_member_id.eq.${member.id},to_member_id.eq.${to_member_id}),and(from_member_id.eq.${to_member_id},to_member_id.eq.${member.id})`
    )
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: 'Connection already exists', status: existing.status }, { status: 409 })
  }

  const { data, error } = await supabase
    .from('member_connections')
    .insert({
      from_member_id: member.id,
      to_member_id,
      status: 'pending',
      message: message ?? null,
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ id: data.id })
}
