import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function generateJoinCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

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

  let body: { template_id?: string; event_id?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }

  const { template_id, event_id } = body
  if (!template_id) {
    return NextResponse.json({ error: 'template_id_required' }, { status: 400 })
  }

  const join_code = generateJoinCode()

  const { data: room, error } = await supabase
    .from('quiz_rooms')
    .insert({
      template_id,
      event_id: event_id ?? null,
      created_by: member.id,
      status: 'waiting',
      join_code,
      current_question_index: 0,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await supabase.from('quiz_participants').insert({
    room_id: room.id,
    member_id: member.id,
    total_score: 0,
  })

  return NextResponse.json(room, { status: 201 })
}
