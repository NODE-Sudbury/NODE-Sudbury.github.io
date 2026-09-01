import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

function makeClient() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n) => cookieStore.get(n)?.value } }
  )
}

async function requireBoard(sb: ReturnType<typeof makeClient>) {
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return null
  const { data: m } = await sb.from('members').select('role').eq('id', user.id).single()
  return m?.role === 'board' ? user : null
}

export async function PATCH(req: Request, { params }: { params: { eventId: string; trackId: string } }) {
  const sb = makeClient()
  if (!await requireBoard(sb)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { data, error } = await sb.from('event_tracks')
    .update(body)
    .eq('id', params.trackId)
    .eq('event_id', params.eventId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}

export async function DELETE(_req: Request, { params }: { params: { eventId: string; trackId: string } }) {
  const sb = makeClient()
  if (!await requireBoard(sb)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { error } = await sb.from('event_tracks')
    .delete()
    .eq('id', params.trackId)
    .eq('event_id', params.eventId)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
