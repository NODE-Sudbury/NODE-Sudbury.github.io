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

  const { challenge_id, hint_index } = await req.json()
  if (challenge_id == null || hint_index == null) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  // Check not already purchased
  const { data: existing } = await supabase
    .from('ctf_hint_purchases')
    .select('id')
    .eq('challenge_id', challenge_id)
    .eq('member_id', session.user.id)
    .eq('hint_index', hint_index)
    .maybeSingle()
  if (existing) return NextResponse.json({ error: 'already_purchased' }, { status: 409 })

  // Fetch challenge hints (service role to access hints column)
  const { createServiceClient } = await import('@/lib/supabase')
  const serviceClient = createServiceClient()
  const { data: challenge } = await serviceClient
    .from('ctf_challenges')
    .select('id, hints, hint_cost_points, event_id')
    .eq('id', challenge_id)
    .single()

  if (!challenge) return NextResponse.json({ error: 'Challenge not found' }, { status: 404 })
  const hints = (challenge.hints as string[] | null) ?? []
  if (hint_index >= hints.length) return NextResponse.json({ error: 'Hint not found' }, { status: 404 })

  const cost = challenge.hint_cost_points ?? 10

  // Deduct points
  await supabase.from('point_events').insert({
    member_id: session.user.id,
    event_id: challenge.event_id,
    points: -cost,
    reason: 'ctf_hint',
    reference_id: challenge_id,
  })

  // Record purchase
  await supabase.from('ctf_hint_purchases').insert({
    challenge_id,
    member_id: session.user.id,
    hint_index,
  })

  return NextResponse.json({ hint_text: hints[hint_index] })
}
