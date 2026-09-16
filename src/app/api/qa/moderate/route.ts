import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function PATCH(request: Request) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const { data: member } = await supabase
    .from('members').select('role').eq('id', session.user.id).single()
  if (!member || !['board', 'admin'].includes(member.role)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  let body: { question_id: string; is_moderated?: boolean; is_answered?: boolean }
  try { body = await request.json() } catch { return NextResponse.json({ error: 'invalid_body' }, { status: 400 }) }

  if (!body.question_id) return NextResponse.json({ error: 'missing_question_id' }, { status: 400 })

  const update: Record<string, boolean> = {}
  if (body.is_moderated !== undefined) update.is_moderated = body.is_moderated
  if (body.is_answered !== undefined) update.is_answered = body.is_answered

  const { data, error } = await supabase
    .from('qa_questions')
    .update(update)
    .eq('id', body.question_id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ question: data })
}
