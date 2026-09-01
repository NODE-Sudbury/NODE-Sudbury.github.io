export const dynamic = 'force-dynamic'

import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

async function getBoard(supabase: ReturnType<typeof createServerClient>, userId: string) {
  const { data } = await supabase.from('members').select('role').eq('id', userId).single()
  return data?.role === 'board' || data?.role === 'admin'
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  if (!await getBoard(supabase, session.user.id)) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  let body: Record<string, unknown>
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }

  // status valid values: draft, published, unlisted, postponed, cancelled, archived
  const { title, slug, type, status, attendance_mode, short_description, description, starts_at, ends_at, max_capacity, location_id, hackathon_finals_event_id, series_id, session_number, recording_url, photos_url, recap_url, survey_url, hackathon_kickoff_at, hackathon_hacking_starts_at, hackathon_judging_starts_at, hackathon_teams_lock_at, hackathon_submission_deadline, hackathon_results_announced_at } = body as Record<string, string>

  if (!title || !type || !starts_at || !ends_at) {
    return NextResponse.json({ error: 'title, type, starts_at, ends_at are required' }, { status: 400 })
  }

  if (new Date(ends_at) <= new Date(starts_at)) {
    return NextResponse.json({ error: 'End date must be after start date.' }, { status: 400 })
  }

  const { data: event, error } = await supabase
    .from('events')
    .update({
      title: String(title).trim(),
      slug: slug ? String(slug).trim() : undefined,
      type,
      status: status ?? 'draft',
      attendance_mode: attendance_mode ?? 'in_person',
      short_description: short_description || null,
      description: description || null,
      starts_at,
      ends_at,
      max_capacity: max_capacity ? parseInt(String(max_capacity)) : null,
      location_id: location_id || null,
      hackathon_finals_event_id: hackathon_finals_event_id || null,
      series_id: series_id || null,
      session_number: session_number ? parseInt(String(session_number)) : null,
      waitlist_auto_promote: typeof (body as any).waitlist_auto_promote === 'boolean' ? (body as any).waitlist_auto_promote : false,
      ...('submissions_open' in body ? { submissions_open: Boolean((body as any).submissions_open) } : {}),
      recording_url: recording_url || null,
      photos_url: photos_url || null,
      recap_url: recap_url || null,
      survey_url: survey_url || null,
      hackathon_kickoff_at: hackathon_kickoff_at || null,
      hackathon_hacking_starts_at: hackathon_hacking_starts_at || null,
      hackathon_judging_starts_at: hackathon_judging_starts_at || null,
      hackathon_teams_lock_at: hackathon_teams_lock_at || null,
      hackathon_submission_deadline: hackathon_submission_deadline || null,
      hackathon_results_announced_at: hackathon_results_announced_at || null,
    })
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ event })
}

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  if (!await getBoard(supabase, session.user.id)) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const { data, error } = await supabase
    .from('events')
    .select('id, title, slug, type, status, short_description, description, starts_at, ends_at, max_capacity, location_id')
    .eq('id', params.id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ event: data })
}
