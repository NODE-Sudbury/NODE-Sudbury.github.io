import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: member } = await supabase.from('members').select('role').eq('id', session.user.id).single()
  if (member?.role !== 'board') return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const { data: rows, error } = await supabase
    .from('event_feedback')
    .select('nps_score, overall_rating, what_went_well, what_could_improve, would_attend_again, submitted_at')
    .eq('event_id', params.id)
    .order('submitted_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const count = rows?.length ?? 0
  const npsRows = rows?.filter(r => r.nps_score !== null) ?? []
  const ratingRows = rows?.filter(r => r.overall_rating !== null) ?? []
  const attendRows = rows?.filter(r => r.would_attend_again !== null) ?? []

  const avgNps = npsRows.length > 0
    ? Math.round((npsRows.reduce((s, r) => s + (r.nps_score ?? 0), 0) / npsRows.length) * 10) / 10
    : null

  const avgRating = ratingRows.length > 0
    ? Math.round((ratingRows.reduce((s, r) => s + (r.overall_rating ?? 0), 0) / ratingRows.length) * 10) / 10
    : null

  const pctAttend = attendRows.length > 0
    ? Math.round((attendRows.filter(r => r.would_attend_again).length / attendRows.length) * 100)
    : null

  const npsDist = Array.from({ length: 11 }, (_, i) => ({
    score: i,
    count: npsRows.filter(r => r.nps_score === i).length,
  }))

  return NextResponse.json({
    count,
    avg_nps: avgNps,
    avg_rating: avgRating,
    pct_attend_again: pctAttend,
    nps_dist: npsDist,
    responses: rows?.map(r => ({
      what_went_well: r.what_went_well,
      what_could_improve: r.what_could_improve,
      submitted_at: r.submitted_at,
    })) ?? [],
  })
}
