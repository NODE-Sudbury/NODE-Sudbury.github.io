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

export async function GET(_req: Request, { params }: { params: { eventId: string } }) {
  const sb = makeClient()
  const { data } = await sb.from('event_sessions')
    .select('id, track_id, room_id, title, description, session_type, speaker_name, speaker_bio, speaker_id, room, starts_at, ends_at')
    .eq('event_id', params.eventId)
    .order('starts_at')
  return NextResponse.json(data ?? [])
}

export async function POST(req: Request, { params }: { params: { eventId: string } }) {
  const sb = makeClient()
  if (!await requireBoard(sb)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { title, description, session_type, track_id, speaker_name, speaker_bio, speaker_id, room, room_id, starts_at, ends_at } = body
  if (!title) return NextResponse.json({ error: 'title required' }, { status: 400 })

  const { data, error } = await sb.from('event_sessions')
    .insert({
      event_id: params.eventId,
      title,
      description: description ?? null,
      session_type: session_type ?? 'talk',
      track_id: track_id ?? null,
      speaker_name: speaker_name ?? null,
      speaker_bio: speaker_bio ?? null,
      speaker_id: speaker_id ?? null,
      room: room ?? null,
      room_id: room_id ?? null,
      starts_at: starts_at ?? null,
      ends_at: ends_at ?? null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data, { status: 201 })
}
