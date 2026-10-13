import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: member } = await supabase.from('members').select('role').eq('id', session.user.id).single()
  if (member?.role !== 'board') return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const [{ data: templates }, { data: events }] = await Promise.all([
    supabase.from('event_templates').select('id, name, description, config').order('id'),
    supabase.from('events')
      .select('id, title, slug, type, status, starts_at')
      .in('status', ['published', 'archived'])
      .order('starts_at', { ascending: false })
      .limit(10),
  ])

  return NextResponse.json({ templates: templates ?? [], events: events ?? [] })
}

export async function DELETE(request: Request) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: member } = await supabase.from('members').select('role').eq('id', session.user.id).single()
  if (member?.role !== 'board') return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const { id } = await request.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { error } = await supabase.from('event_templates').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
