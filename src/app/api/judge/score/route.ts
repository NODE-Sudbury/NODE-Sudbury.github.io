import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { event_id, submission_id, scores } = body
  if (!event_id || !submission_id || !Array.isArray(scores) || scores.length === 0) {
    return NextResponse.json({ error: 'event_id, submission_id, and scores[] required' }, { status: 400 })
  }

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: judge } = await db
    .from('judges')
    .select('id')
    .eq('event_id', event_id)
    .eq('member_id', session.user.id)
    .maybeSingle()
  if (!judge) return NextResponse.json({ error: 'Not a judge for this event' }, { status: 403 })

  const { data: assignment } = await db
    .from('judging_assignments')
    .select('id')
    .eq('judge_id', judge.id)
    .eq('submission_id', submission_id)
    .maybeSingle()
  if (!assignment) return NextResponse.json({ error: 'Submission not assigned to you' }, { status: 403 })

  const { data: recusal } = await db
    .from('judge_recusals')
    .select('id')
    .eq('judge_id', judge.id)
    .eq('submission_id', submission_id)
    .maybeSingle()
  if (recusal) return NextResponse.json({ error: 'You have recused yourself from this submission' }, { status: 403 })

  const rows = scores.map((s: { rubric_id: string; score: number; notes?: string | null }) => ({
    judge_id: judge.id,
    submission_id,
    rubric_id: s.rubric_id,
    score: Math.max(0, Number(s.score)),
    notes: s.notes ?? null,
  }))

  const { data, error } = await db
    .from('judging_scores')
    .upsert(rows, { onConflict: 'judge_id,submission_id,rubric_id' })
    .select()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ scores: data }, { status: 200 })
}
