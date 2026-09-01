import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function csvEscape(val: unknown): string {
  if (val === null || val === undefined) return ''
  const s = String(val)
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"'
  }
  return s
}

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

  const { data: rows } = await supabase
    .from('event_feedback')
    .select('nps_score, overall_rating, what_went_well, what_could_improve, would_attend_again, submitted_at')
    .eq('event_id', params.id)
    .order('submitted_at', { ascending: true })

  const header = 'event_id,nps_score,overall_rating,what_went_well,what_could_improve,would_attend_again,submitted_at\n'
  const body = (rows ?? []).map(r =>
    [params.id, r.nps_score, r.overall_rating, r.what_went_well, r.what_could_improve, r.would_attend_again, r.submitted_at]
      .map(csvEscape)
      .join(',')
  ).join('\n')

  return new NextResponse(header + body, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="feedback-${params.id}.csv"`,
    },
  })
}
