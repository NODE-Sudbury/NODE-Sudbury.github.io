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

  let body: { room_id?: string; question_id?: string; selected_option_index?: number; time_taken_ms?: number }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }

  const { room_id, question_id, selected_option_index, time_taken_ms } = body
  if (!room_id || !question_id || selected_option_index === undefined || !time_taken_ms) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 })
  }

  const { data: question } = await supabase
    .from('quiz_questions')
    .select('id, correct_option_index, points_value')
    .eq('id', question_id)
    .single()

  if (!question) return NextResponse.json({ error: 'question_not_found' }, { status: 404 })

  const { data: existing } = await supabase
    .from('quiz_answers')
    .select('id')
    .eq('room_id', room_id)
    .eq('question_id', question_id)
    .eq('member_id', member.id)
    .single()

  if (existing) {
    return NextResponse.json({ error: 'already_answered' }, { status: 409 })
  }

  const is_correct = selected_option_index === question.correct_option_index
  let points_earned = is_correct ? question.points_value : 0
  if (is_correct && time_taken_ms < 5000) {
    points_earned = Math.round(points_earned * 1.1)
  }

  const { error: insertErr } = await supabase.from('quiz_answers').insert({
    room_id,
    question_id,
    member_id: member.id,
    selected_option_index,
    is_correct,
    points_earned,
    time_taken_ms,
  })

  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 })

  if (points_earned > 0) {
    const { data: p } = await supabase
      .from('quiz_participants')
      .select('total_score')
      .eq('room_id', room_id)
      .eq('member_id', member.id)
      .single()
    if (p) {
      await supabase
        .from('quiz_participants')
        .update({ total_score: (p.total_score ?? 0) + points_earned })
        .eq('room_id', room_id)
        .eq('member_id', member.id)
    }
  }

  return NextResponse.json({
    is_correct,
    points_earned,
    correct_option_index: question.correct_option_index,
  })
}
