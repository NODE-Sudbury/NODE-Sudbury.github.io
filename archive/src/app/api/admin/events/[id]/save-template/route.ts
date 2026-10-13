import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: Request, { params }: { params: { id: string } }) {
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

  const body = await request.json()
  const { template_name, description } = body
  if (!template_name?.trim()) return NextResponse.json({ error: 'template_name required' }, { status: 400 })

  // Fetch event
  const { data: ev } = await supabase.from('events').select('*').eq('id', params.id).single()
  if (!ev) return NextResponse.json({ error: 'event not found' }, { status: 404 })

  // Fetch ticket types and tags
  const [{ data: tickets }, { data: tagLinks }] = await Promise.all([
    supabase.from('ticket_types').select('name, pricing_model, price_cents, quantity_available, description').eq('event_id', params.id),
    supabase.from('event_tag_links').select('tag_id').eq('event_id', params.id),
  ])

  const config = {
    type: ev.type,
    description: ev.description,
    short_description: ev.short_description,
    max_capacity: ev.max_capacity,
    attendance_mode: ev.attendance_mode,
    waitlist_auto_promote: ev.waitlist_auto_promote,
    ticket_types: (tickets ?? []).map(tt => ({
      name: tt.name,
      pricing_model: tt.pricing_model,
      price_cents: tt.price_cents,
      quantity_available: tt.quantity_available,
      description: tt.description,
    })),
    tag_ids: (tagLinks ?? []).map(tl => tl.tag_id),
  }

  const { data: tmpl, error } = await supabase
    .from('event_templates')
    .insert({ name: template_name.trim(), description: description?.trim() ?? null, config, chapter_id: ev.chapter_id })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ template: tmpl }, { status: 201 })
}
