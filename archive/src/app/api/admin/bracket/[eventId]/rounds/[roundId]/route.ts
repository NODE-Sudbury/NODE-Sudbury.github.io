import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

async function getBoard(supabase: ReturnType<typeof createServerClient>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { data } = await supabase.from('members').select('is_board').eq('user_id', user.id).single()
  return data?.is_board === true
}

export async function PATCH(req: Request, { params }: { params: { eventId: string; roundId: string } }) {
  const cookieStore = cookies()
    const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  )
  if (!await getBoard(supabase)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const allowed = ['name', 'round_order', 'status', 'max_advancing', 'starts_at', 'ends_at']
  const update: Record<string, unknown> = {}
  for (const k of allowed) if (k in body) update[k] = body[k]

  const { data, error } = await supabase
    .from('hackathon_rounds')
    .update(update)
    .eq('id', params.roundId)
    .eq('event_id', params.eventId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}

export async function DELETE(_req: Request, { params }: { params: { eventId: string; roundId: string } }) {
  const cookieStore = cookies()
    const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  )
  if (!await getBoard(supabase)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await supabase.from('hackathon_rounds').delete().eq('id', params.roundId).eq('event_id', params.eventId)
  return NextResponse.json({ ok: true })
}
