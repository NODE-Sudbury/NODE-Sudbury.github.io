import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

async function getBoard(supabase: ReturnType<typeof createServerClient>) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null
  const { data: member } = await supabase
    .from('members')
    .select('id, role')
    .eq('user_id', session.user.id)
    .single()
  if (!member || member.role !== 'board') return null
  return member
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
  const board = await getBoard(supabase)
  if (!board) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  let body: {
    question_text?: string
    options?: string[]
    correct_option_index?: number
    points_value?: number
    time_limit_seconds?: number
    sort_order?: number
  }
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }

  const { question_text, options, correct_option_index, points_value = 100, time_limit_seconds = 30, sort_order = 0 } = body
  if (!question_text || !options || options.length < 2 || correct_option_index === undefined) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('quiz_questions')
    .insert({
      template_id: params.id,
      question_text,
      options,
      correct_option_index,
      points_value,
      time_limit_seconds,
      sort_order,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
