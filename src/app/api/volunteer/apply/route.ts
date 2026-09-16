import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n) => cookieStore.get(n)?.value } }
  )
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  const { event_id, motivation, hours_available, skills } = await req.json()
  if (!motivation?.trim()) return NextResponse.json({ error: 'Motivation required' }, { status: 400 })

  const { data: existing } = await supabase
    .from('volunteer_applications')
    .select('id')
    .eq('event_id', event_id)
    .eq('member_id', session.user.id)
    .single()

  if (existing) return NextResponse.json({ error: 'Already applied' }, { status: 409 })

  const { error } = await supabase.from('volunteer_applications').insert({
    event_id,
    member_id: session.user.id,
    motivation,
    hours_available: hours_available ?? null,
    skills: skills ?? [],
    status: 'pending',
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
