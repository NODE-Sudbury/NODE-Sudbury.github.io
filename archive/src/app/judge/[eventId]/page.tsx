import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { supabase } from '@/lib/supabase'
import { cookies } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import JudgePortal from './JudgePortal'

export const dynamic = 'force-dynamic'

export default async function JudgePortalPage({ params }: { params: { eventId: string } }) {
  const { eventId } = params

  const cookieStore = cookies()
  const serverClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
  const { data: { session } } = await serverClient.auth.getSession()
  if (!session) redirect('/login')

  const { data: event } = await supabase
    .from('events')
    .select('id, title, type, status')
    .eq('id', eventId)
    .eq('type', 'hackathon')
    .single()
  if (!event) notFound()

  const { data: judge } = await supabase
    .from('judges')
    .select('id')
    .eq('event_id', eventId)
    .eq('member_id', session.user.id)
    .maybeSingle()
  if (!judge) redirect('/dashboard')

  const [{ data: assignments }, { data: rubric }, { data: existingScores }] = await Promise.all([
    supabase
      .from('judging_assignments')
      .select('id, submission_id, hackathon_submissions(id, title, short_description, demo_url, deck_url, sub_status, hackathon_teams(name))')
      .eq('judge_id', judge.id),
    supabase
      .from('judging_rubrics')
      .select('id, name, description, max_score')
      .eq('event_id', eventId)
      .order('created_at'),
    supabase
      .from('judging_scores')
      .select('id, submission_id, rubric_id, score, notes')
      .eq('judge_id', judge.id),
  ])

  return (
    <JudgePortal
      event={event}
      judgeId={judge.id}
      assignments={(assignments ?? []) as any}
      rubric={(rubric ?? []) as any}
      existingScores={(existingScores ?? []) as any}
    />
  )
}
