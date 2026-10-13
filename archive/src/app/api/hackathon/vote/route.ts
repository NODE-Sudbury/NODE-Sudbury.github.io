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

  const { award_id, team_id } = await req.json()
  if (!award_id || !team_id) return NextResponse.json({ error: 'Missing award_id or team_id' }, { status: 400 })

  // Verify award exists and allows community voting
  const { data: award } = await supabase
    .from('awards')
    .select('id, award_type')
    .eq('id', award_id)
    .single()

  if (!award) return NextResponse.json({ error: 'Award not found' }, { status: 404 })
  if (award.award_type !== 'community_vote') return NextResponse.json({ error: 'This award does not accept community votes' }, { status: 400 })

  // Check already voted
  const { data: existing } = await supabase
    .from('community_votes')
    .select('id')
    .eq('award_id', award_id)
    .eq('member_id', session.user.id)
    .maybeSingle()

  if (existing) return NextResponse.json({ error: 'already_voted' }, { status: 409 })

  const { error } = await supabase.from('community_votes').insert({
    award_id,
    member_id: session.user.id,
    team_id,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true }, { status: 201 })
}
