import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function makeClient() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n: string) => cookieStore.get(n)?.value } }
  )
}

async function requireBoard(supabase: ReturnType<typeof makeClient>) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return false
  const { data } = await supabase.from('members').select('role').eq('id', session.user.id).single()
  return data && ['board', 'admin', 'super_admin'].includes(data.role)
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const supabase = makeClient()
  const { data: rooms, error } = await supabase
    .from('event_rooms')
    .select('id, name, capacity, notes, created_at')
    .eq('event_id', params.id)
    .order('created_at')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const roomIds = (rooms ?? []).map((r: { id: string }) => r.id)
  const sessionCounts: Record<string, number> = {}
  if (roomIds.length > 0) {
    const { data: sessionRows } = await supabase
      .from('event_sessions')
      .select('room_id')
      .in('room_id', roomIds)
    for (const row of sessionRows ?? []) {
      if (row.room_id) {
        sessionCounts[row.room_id] = (sessionCounts[row.room_id] ?? 0) + 1
      }
    }
  }

  const result = (rooms ?? []).map((r: { id: string; name: string; capacity: number | null; notes: string | null; created_at: string }) => ({
    ...r,
    session_count: sessionCounts[r.id] ?? 0,
  }))

  return NextResponse.json(result)
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const supabase = makeClient()
  if (!await requireBoard(supabase)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  if (!body.name || !body.name.trim()) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('event_rooms')
    .insert({
      event_id: params.id,
      name: body.name.trim(),
      capacity: body.capacity ?? null,
      notes: body.notes ?? null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
