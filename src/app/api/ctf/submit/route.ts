import { createServerClient } from '@supabase/auth-helpers-nextjs'
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

  const { challenge_id, flag } = await req.json()
  if (!challenge_id || !flag) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  // Check already solved
  const { data: existing } = await supabase
    .from('ctf_submissions')
    .select('id')
    .eq('challenge_id', challenge_id)
    .eq('member_id', session.user.id)
    .eq('is_correct', true)
    .maybeSingle()
  if (existing) return NextResponse.json({ error: 'already_solved' }, { status: 409 })

  // Fetch challenge with flag (server-side only)
  const { createServiceClient } = await import('@/lib/supabase')
  const serviceClient = createServiceClient()
  const { data: challenge } = await serviceClient
    .from('ctf_challenges')
    .select('id, flag, points, event_id')
    .eq('id', challenge_id)
    .eq('is_active', true)
    .single()

  if (!challenge) return NextResponse.json({ error: 'Challenge not found' }, { status: 404 })

  const is_correct = flag.trim() === challenge.flag.trim()

  await supabase.from('ctf_submissions').insert({
    challenge_id,
    member_id: session.user.id,
    submitted_flag: flag,
    is_correct,
  })

  if (is_correct) {
    await supabase.from('point_events').insert({
      member_id: session.user.id,
      event_id: challenge.event_id,
      points: challenge.points,
      reason: 'ctf_solve',
      reference_id: challenge_id,
    })
  }

  return NextResponse.json({ correct: is_correct, points_earned: is_correct ? challenge.points : 0 })
}
