import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

async function getSupabaseAndBoard() {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { supabase, session: null, isBoard: false }
  const { data: member } = await supabase.from('members').select('role').eq('id', session.user.id).single()
  return { supabase, session, isBoard: member?.role === 'board' }
}

export async function GET(_: Request, { params }: { params: { eventId: string } }) {
  const { supabase, isBoard } = await getSupabaseAndBoard()
  if (!isBoard) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const { data: hunt } = await supabase
    .from('scavenger_hunts')
    .select('id, title, description, is_active, starts_at, ends_at')
    .eq('event_id', params.eventId)
    .maybeSingle()

  const stations = hunt ? (await supabase
    .from('scavenger_stations')
    .select('id, name, hint_text, points_value, sort_order, qr_token, created_at')
    .eq('hunt_id', hunt.id)
    .order('sort_order', { ascending: true })
  ).data ?? [] : []

  return NextResponse.json({ hunt, stations })
}

export async function POST(request: Request, { params }: { params: { eventId: string } }) {
  const { supabase, isBoard } = await getSupabaseAndBoard()
  if (!isBoard) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  let body: any
  try { body = await request.json() } catch { return NextResponse.json({ error: 'invalid_body' }, { status: 400 }) }

  const { title, description, is_active, starts_at, ends_at } = body
  if (!title) return NextResponse.json({ error: 'title_required' }, { status: 400 })

  const { data: existing } = await supabase
    .from('scavenger_hunts')
    .select('id')
    .eq('event_id', params.eventId)
    .maybeSingle()

  let hunt
  if (existing) {
    const { data } = await supabase
      .from('scavenger_hunts')
      .update({ title, description, is_active: is_active ?? false, starts_at: starts_at ?? null, ends_at: ends_at ?? null })
      .eq('id', existing.id)
      .select()
      .single()
    hunt = data
  } else {
    const { data } = await supabase
      .from('scavenger_hunts')
      .insert({ event_id: params.eventId, title, description, is_active: is_active ?? false, starts_at: starts_at ?? null, ends_at: ends_at ?? null })
      .select()
      .single()
    hunt = data
  }

  return NextResponse.json({ hunt }, { status: existing ? 200 : 201 })
}
