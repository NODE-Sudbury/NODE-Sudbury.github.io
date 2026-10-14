import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  let body: { question_id: string }
  try { body = await request.json() } catch { return NextResponse.json({ error: 'invalid_body' }, { status: 400 }) }

  if (!body.question_id) return NextResponse.json({ error: 'missing_question_id' }, { status: 400 })

  const { error } = await supabase.rpc('toggle_qa_upvote', {
    p_question_id: body.question_id,
    p_member_id: session.user.id,
  })

  if (error) {
    // Fallback: direct increment if RPC not available
    const { error: e2 } = await supabase
      .from('qa_questions')
      .update({ upvotes: supabase.rpc('upvotes + 1' as any) })
      .eq('id', body.question_id)
    if (e2) return NextResponse.json({ error: e2.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
