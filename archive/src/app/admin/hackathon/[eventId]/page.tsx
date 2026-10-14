import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import JudgingAdmin from './JudgingAdmin'

export const dynamic = 'force-dynamic'

export default async function AdminHackathonPage({ params }: { params: { eventId: string } }) {
  const { eventId } = params

  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const { data: member } = await supabase.from('members').select('role').eq('id', session.user.id).single()
  if (member?.role !== 'board') redirect('/dashboard')

  const { data: event } = await supabase
    .from('events')
    .select('id, title, type, status, hackathon_finals_event_id, submissions_open')
    .eq('id', eventId)
    .eq('type', 'hackathon')
    .single()
  if (!event) notFound()

  // If this is a finals event (another hackathon links here), load submissions from the kickoff
  const { data: kickoffEvent } = await supabase
    .from('events')
    .select('id, title, starts_at')
    .eq('hackathon_finals_event_id', eventId)
    .maybeSingle()

  const submissionsEventId = kickoffEvent ? kickoffEvent.id : eventId

  const [{ data: submissions }, { data: judges }, { data: assignments }, { data: rubric }, { data: finalsEvent }] = await Promise.all([
    supabase
      .from('hackathon_submissions')
      .select('id, title, sub_status, demo_url, deck_url, hackathon_teams(name)')
      .eq('event_id', submissionsEventId)
      .is('round_id', null),
    supabase
      .from('judges')
      .select('id, member_id, members(full_name, email)')
      .eq('event_id', eventId),
    supabase
      .from('judging_assignments')
      .select('id, judge_id, submission_id')
      .eq('event_id', eventId),
    supabase
      .from('judging_rubrics')
      .select('id, name, description, max_score')
      .eq('event_id', eventId)
      .order('created_at'),
    event.hackathon_finals_event_id
      ? supabase.from('events').select('id, title, starts_at').eq('id', event.hackathon_finals_event_id).single().then(r => r)
      : Promise.resolve({ data: null }),
  ])

  return (
    <JudgingAdmin
      event={event}
      submissions={(submissions ?? []) as any}
      judges={(judges ?? []) as any}
      assignments={(assignments ?? []) as any}
      rubric={(rubric ?? []) as any}
      kickoffEvent={kickoffEvent as any}
      finalsEvent={(finalsEvent as any)?.data ?? null}
    />
  )
}
