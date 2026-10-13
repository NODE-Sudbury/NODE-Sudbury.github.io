import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request, { params }: { params: { eventId: string } }) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: member } = await supabase
    .from('members').select('id').eq('user_id', session.user.id).single()
  if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 })

  const { data, error } = await supabase
    .from('async_submissions')
    .select('*, async_challenges(title, submission_type, submissions_close_at, allow_updates)')
    .eq('event_id', params.eventId)
    .eq('member_id', member.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request, { params }: { params: { eventId: string } }) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: member } = await supabase
    .from('members').select('id').eq('user_id', session.user.id).single()
  if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 })

  const body = await request.json()
  const { challenge_id, title, description, submission_url, submission_text, status } = body

  const { data: challenge } = await supabase
    .from('async_challenges')
    .select('submissions_open_at, submissions_close_at, allow_updates')
    .eq('id', challenge_id)
    .single()
  if (!challenge) return NextResponse.json({ error: 'Challenge not found' }, { status: 404 })

  const now = new Date()
  if (challenge.submissions_open_at && new Date(challenge.submissions_open_at) > now)
    return NextResponse.json({ error: 'Submissions not yet open' }, { status: 400 })
  if (challenge.submissions_close_at && new Date(challenge.submissions_close_at) < now)
    return NextResponse.json({ error: 'Submissions are closed' }, { status: 400 })

  const payload: Record<string, unknown> = {
    challenge_id, event_id: params.eventId, member_id: member.id,
    title, description, submission_url, submission_text,
    status: status ?? 'draft',
    updated_at: new Date().toISOString(),
  }
  if (status === 'submitted') payload.submitted_at = new Date().toISOString()

  const { data, error } = await supabase
    .from('async_submissions')
    .upsert(payload, { onConflict: 'challenge_id,member_id' })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
