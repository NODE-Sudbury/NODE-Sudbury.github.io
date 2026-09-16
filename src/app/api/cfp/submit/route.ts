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

  let body: any
  try { body = await request.json() } catch { return NextResponse.json({ error: 'invalid_body' }, { status: 400 }) }

  const { event_id, title, talk_type, duration_minutes, abstract, speaker_bio, requirements, co_speakers, is_first_time } = body
  if (!event_id || !title || !abstract || !talk_type) {
    return NextResponse.json({ error: 'missing_required_fields' }, { status: 400 })
  }

  const { data: flag } = await supabase
    .from('feature_flags').select('enabled').eq('key', 'cfp_enabled').maybeSingle()
  if (!flag?.enabled) return NextResponse.json({ error: 'cfp_closed' }, { status: 403 })

  const { data: existing } = await supabase
    .from('cfp_submissions')
    .select('id, status')
    .eq('event_id', event_id)
    .eq('member_id', session.user.id)
    .maybeSingle()

  if (existing && ['accepted', 'rejected'].includes(existing.status)) {
    return NextResponse.json({ error: 'submission_locked' }, { status: 409 })
  }

  const payload = {
    event_id,
    member_id: session.user.id,
    title: title.trim(),
    talk_type,
    duration_minutes: Number(duration_minutes) || 30,
    abstract: abstract.trim(),
    speaker_bio: speaker_bio?.trim() ?? null,
    requirements: requirements?.trim() ?? null,
    co_speakers: Array.isArray(co_speakers) ? co_speakers : [],
    is_first_time: Boolean(is_first_time),
    status: 'submitted',
  }

  let submission: any
  if (existing) {
    const { data, error } = await supabase
      .from('cfp_submissions')
      .update(payload)
      .eq('id', existing.id)
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    submission = data
  } else {
    const { data, error } = await supabase
      .from('cfp_submissions')
      .insert(payload)
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    submission = data
  }

  return NextResponse.json({ submission }, { status: existing ? 200 : 201 })
}
