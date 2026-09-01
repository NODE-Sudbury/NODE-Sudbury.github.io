import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
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
  if (!session) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }

  const { data: member } = await supabase
    .from('members')
    .select('id')
    .eq('user_id', session.user.id)
    .single()
  if (!member) return NextResponse.json({ error: 'member_not_found' }, { status: 404 })

  let body: { join_code?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }

  const { join_code } = body
  if (!join_code) return NextResponse.json({ error: 'join_code_required' }, { status: 400 })

  const { data: room } = await supabase
    .from('quiz_rooms')
    .select('id, status')
    .eq('join_code', join_code.toUpperCase())
    .neq('status', 'finished')
    .single()

  if (!room) {
    return NextResponse.json({ error: 'room_not_found' }, { status: 404 })
  }

  const { data: existing } = await supabase
    .from('quiz_participants')
    .select('id')
    .eq('room_id', room.id)
    .eq('member_id', member.id)
    .single()

  if (!existing) {
    await supabase.from('quiz_participants').insert({
      room_id: room.id,
      member_id: member.id,
      total_score: 0,
    })
  }

  return NextResponse.json({ room_id: room.id })
}
