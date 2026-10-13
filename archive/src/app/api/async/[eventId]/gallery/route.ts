import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(_req: Request, { params }: { params: { eventId: string } }) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data: challenges } = await supabase
    .from('async_challenges')
    .select('id, results_at')
    .eq('event_id', params.eventId)

  if (!challenges?.length) return NextResponse.json([])

  const now = new Date()
  const readyChallengeIds = challenges
    .filter(c => c.results_at && new Date(c.results_at) <= now)
    .map(c => c.id)

  if (!readyChallengeIds.length) return NextResponse.json([])

  const { data, error } = await supabase
    .from('async_submissions')
    .select('id, title, description, submission_url, submission_text, status, score, submitted_at, members(display_name, avatar_url), async_challenges(title)')
    .in('challenge_id', readyChallengeIds)
    .in('status', ['submitted', 'reviewed', 'winner', 'honourable_mention'])
    .order('status', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
