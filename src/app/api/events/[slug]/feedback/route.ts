import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: Request, { params }: { params: { slug: string } }) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: event } = await supabase
    .from('events')
    .select('id, status')
    .eq('slug', params.slug)
    .is('deleted_at', null)
    .single()

  if (!event) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  if (event.status !== 'archived') return NextResponse.json({ error: 'event_not_archived' }, { status: 400 })

  const { data: existing } = await supabase
    .from('event_feedback')
    .select('id')
    .eq('event_id', event.id)
    .eq('member_id', session.user.id)
    .maybeSingle()

  if (existing) return NextResponse.json({ error: 'already_submitted' }, { status: 409 })

  const body = await request.json()

  const { error } = await supabase.from('event_feedback').insert({
    event_id: event.id,
    member_id: session.user.id,
    nps_score: body.nps_score ?? null,
    overall_rating: body.overall_rating ?? null,
    what_went_well: body.what_went_well ?? null,
    what_could_improve: body.what_could_improve ?? null,
    would_attend_again: body.would_attend_again ?? null,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true }, { status: 201 })
}
