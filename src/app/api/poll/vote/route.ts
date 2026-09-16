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

  let body: { poll_id: string; option_id: string }
  try { body = await request.json() } catch { return NextResponse.json({ error: 'invalid_body' }, { status: 400 }) }

  if (!body.poll_id || !body.option_id) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 })
  }

  const { data: poll } = await supabase
    .from('live_polls').select('id, status, allows_multiple').eq('id', body.poll_id).single()
  if (!poll || poll.status !== 'active') {
    return NextResponse.json({ error: 'poll_not_active' }, { status: 409 })
  }

  const { data: existing } = await supabase
    .from('poll_responses')
    .select('id')
    .eq('poll_id', body.poll_id)
    .eq('member_id', session.user.id)
    .maybeSingle()

  if (existing && !poll.allows_multiple) {
    return NextResponse.json({ error: 'already_voted' }, { status: 409 })
  }

  const { error } = await supabase
    .from('poll_responses')
    .insert({
      poll_id: body.poll_id,
      option_id: body.option_id,
      member_id: session.user.id,
    })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: results } = await supabase
    .from('poll_options')
    .select('id, option_text, vote_count')
    .eq('poll_id', body.poll_id)
    .order('sort_order', { ascending: true })

  return NextResponse.json({ ok: true, results: results ?? [] })
}
