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

export async function PATCH(req: Request, { params }: { params: { id: string; roomId: string } }) {
  const supabase = makeClient()
  if (!await requireBoard(supabase)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json() as Record<string, unknown>
  const updates: Record<string, unknown> = {}
  if (body.name !== undefined) updates.name = body.name
  if (body.capacity !== undefined) updates.capacity = body.capacity
  if (body.notes !== undefined) updates.notes = body.notes

  const { data, error } = await supabase
    .from('event_rooms')
    .update(updates)
    .eq('id', params.roomId)
    .eq('event_id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_req: Request, { params }: { params: { id: string; roomId: string } }) {
  const supabase = makeClient()
  if (!await requireBoard(supabase)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { error: clearError } = await supabase
    .from('event_sessions')
    .update({ room_id: null })
    .eq('room_id', params.roomId)
    .eq('event_id', params.id)

  if (clearError) return NextResponse.json({ error: clearError.message }, { status: 500 })

  const { error } = await supabase
    .from('event_rooms')
    .delete()
    .eq('id', params.roomId)
    .eq('event_id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
