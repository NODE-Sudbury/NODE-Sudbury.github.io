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

export async function GET(_req: Request, { params }: { params: { eventId: string } }) {
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
  const { data } = await supabase
    .from('hackathon_rounds')
    .select('*, hackathon_round_teams(*, hackathon_teams(id, name))')
    .eq('event_id', params.eventId)
    .order('round_order')
  return NextResponse.json(data ?? [])
}

export async function POST(req: Request, { params }: { params: { eventId: string } }) {
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
  const { data, error } = await supabase
    .from('hackathon_rounds')
    .insert({
      event_id: params.eventId,
      name: body.name,
      round_order: body.round_order ?? 1,
      max_advancing: body.max_advancing ?? null,
      starts_at: body.starts_at ?? null,
      ends_at: body.ends_at ?? null,
      status: 'pending',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data, { status: 201 })
}
