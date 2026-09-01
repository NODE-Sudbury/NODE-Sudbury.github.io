import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + Date.now().toString(36)
}

export async function POST(request: Request) {
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
  const { template_id, title, starts_at, ends_at, location_id } = body
  if (!template_id || !title?.trim()) {
    return NextResponse.json({ error: 'template_id and title required' }, { status: 400 })
  }

  // Fetch template
  const { data: tmpl } = await supabase.from('event_templates').select('*').eq('id', template_id).single()
  if (!tmpl) return NextResponse.json({ error: 'template not found' }, { status: 404 })

  const cfg = tmpl.config as Record<string, unknown>

  // Create event from template config
  const { data: newEvent, error: evErr } = await supabase
    .from('events')
    .insert({
      chapter_id: tmpl.chapter_id,
      title: title.trim(),
      slug: slugify(title.trim()),
      description: cfg.description as string ?? null,
      short_description: cfg.short_description as string ?? null,
      type: cfg.type as string ?? 'meetup',
      max_capacity: cfg.max_capacity as number ?? null,
      attendance_mode: cfg.attendance_mode as string ?? 'in_person',
      waitlist_auto_promote: cfg.waitlist_auto_promote as boolean ?? false,
      location_id: location_id ?? null,
      starts_at: starts_at ?? null,
      ends_at: ends_at ?? null,
      status: 'draft',
      created_by: session.user.id,
    })
    .select()
    .single()

  if (evErr || !newEvent) return NextResponse.json({ error: evErr?.message ?? 'create failed' }, { status: 500 })

  // Create ticket types from template
  const ticketTypes = (cfg.ticket_types as Array<Record<string, unknown>>) ?? []
  if (ticketTypes.length > 0) {
    await supabase.from('ticket_types').insert(
      ticketTypes.map(tt => ({
        event_id: newEvent.id,
        name: tt.name,
        pricing_model: tt.pricing_model,
        price_cents: tt.price_cents ?? 0,
        quantity_available: tt.quantity_available ?? null,
        description: tt.description ?? null,
        is_active: true,
      }))
    )
  }

  // Link tags from template
  const tagIds = (cfg.tag_ids as string[]) ?? []
  if (tagIds.length > 0) {
    await supabase.from('event_tag_links').insert(tagIds.map(tag_id => ({ event_id: newEvent.id, tag_id })))
  }

  return NextResponse.json({ event: newEvent }, { status: 201 })
}
