import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: Request, { params }: { params: { eventId: string } }) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const { data: member } = await supabase.from('members').select('role').eq('id', session.user.id).single()
  if (member?.role !== 'board') return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  let body: any
  try { body = await request.json() } catch { return NextResponse.json({ error: 'invalid_body' }, { status: 400 }) }

  const { hunt_id, name, hint_text, points_value, sort_order } = body
  if (!hunt_id || !name) return NextResponse.json({ error: 'hunt_id_and_name_required' }, { status: 400 })

  const qr_token = crypto.randomUUID().replace(/-/g, '').slice(0, 16)

  const { data: station, error } = await supabase
    .from('scavenger_stations')
    .insert({
      hunt_id,
      name,
      hint_text: hint_text ?? null,
      points_value: points_value ?? 10,
      sort_order: sort_order ?? 0,
      qr_token,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ station }, { status: 201 })
}
