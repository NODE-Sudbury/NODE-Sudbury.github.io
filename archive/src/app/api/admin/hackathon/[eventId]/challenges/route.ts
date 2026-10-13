import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(req: Request, { params }: { params: { eventId: string } }) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: member } = await supabase.from('members').select('role').eq('id', session.user.id).single()
  if (member?.role !== 'board') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { title, description, category, points, difficulty, flag, flag_format_hint, hints, hint_cost_points, max_attempts } = body
  if (!title || !flag || !points || !difficulty) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })

  const { data, error } = await supabase.from('ctf_challenges').insert({
    event_id: params.eventId,
    title,
    description,
    category: category ?? 'misc',
    points,
    difficulty,
    flag,
    flag_format_hint,
    hints: hints ?? [],
    hint_cost_points: hint_cost_points ?? 10,
    max_attempts: max_attempts ?? null,
    is_active: true,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
