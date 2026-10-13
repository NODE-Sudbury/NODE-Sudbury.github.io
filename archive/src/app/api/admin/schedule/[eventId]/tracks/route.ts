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
  if (m?.role !== 'board') return null
  return user
}

export async function GET(_req: Request, { params }: { params: { eventId: string } }) {
  const sb = makeClient()
  const { data } = await sb.from('event_tracks')
    .select('id, name, color, sort_order')
    .eq('event_id', params.eventId)
    .order('sort_order')
  return NextResponse.json(data ?? [])
}

export async function POST(req: Request, { params }: { params: { eventId: string } }) {
  const sb = makeClient()
  if (!await requireBoard(sb)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { name, color, sort_order } = body
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 })

  const { data, error } = await sb.from('event_tracks')
    .insert({ event_id: params.eventId, name, color: color ?? '#38bdf8', sort_order: sort_order ?? 0 })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data, { status: 201 })
}
