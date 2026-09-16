import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: Request, { params }: { params: { roomId: string } }) {
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
    .eq('id', session.user.id)
    .single()
  if (!member) return NextResponse.json({ error: 'member_not_found' }, { status: 404 })

  const { data: room } = await supabase
    .from('quiz_rooms')
    .select('id, created_by, status, current_question_index')
    .eq('id', params.roomId)
    .single()

  if (!room) return NextResponse.json({ error: 'room_not_found' }, { status: 404 })
  if (room.created_by !== member.id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  let body: { action?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }

  const { action } = body
  let update: Record<string, unknown> = {}

  if (action === 'start') {
    update = { status: 'active', current_question_index: 0 }
  } else if (action === 'next') {
    update = { current_question_index: (room.current_question_index ?? 0) + 1 }
  } else if (action === 'end') {
    update = { status: 'finished' }
  } else {
    return NextResponse.json({ error: 'invalid_action' }, { status: 400 })
  }

  const { error } = await supabase
    .from('quiz_rooms')
    .update(update)
    .eq('id', params.roomId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
