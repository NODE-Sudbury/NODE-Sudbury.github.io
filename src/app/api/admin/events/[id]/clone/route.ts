import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(_request: Request, { params }: { params: { id: string } }) {
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

  // Fetch source event
  const { data: ev, error: evErr } = await supabase
    .from('events')
    .select('*')
    .eq('id', params.id)
    .single()
  if (evErr || !ev) return NextResponse.json({ error: 'event not found' }, { status: 404 })

  // Fetch ticket types
  const { data: tickets } = await supabase
    .from('ticket_types')
    .select('name, pricing_model, price_cents, quantity_available, description')
    .eq('event_id', params.id)

  // Fetch tag links
  const { data: tagLinks } = await supabase
    .from('event_tag_links')
    .select('tag_id')
    .eq('event_id', params.id)

  // Build unique slug
  const newSlug = `${ev.slug}-copy-${Date.now().toString(36)}`

  // Clone event (nullify date/status fields)
  const { data: newEvent, error: insertErr } = await supabase
    .from('events')
    .insert({
      chapter_id: ev.chapter_id,
      type: ev.type,
      location_id: ev.location_id,
      title: `${ev.title} (Copy)`,
      slug: newSlug,
      description: ev.description,
      short_description: ev.short_description,
      cover_image_url: ev.cover_image_url,
      thumbnail_url: ev.thumbnail_url,
      max_capacity: ev.max_capacity,
      attendance_mode: ev.attendance_mode,
      waitlist_auto_promote: ev.waitlist_auto_promote,
      status: 'draft',
      starts_at: null,
      ends_at: null,
      created_by: session.user.id,
    })
    .select()
    .single()

  if (insertErr || !newEvent) {
    return NextResponse.json({ error: insertErr?.message ?? 'clone failed' }, { status: 500 })
  }

  // Clone ticket types
  if (tickets && tickets.length > 0) {
    await supabase.from('ticket_types').insert(
      tickets.map(tt => ({ ...tt, event_id: newEvent.id, is_active: true }))
    )
  }

  // Clone tag links
  if (tagLinks && tagLinks.length > 0) {
    await supabase.from('event_tag_links').insert(
      tagLinks.map(tl => ({ event_id: newEvent.id, tag_id: tl.tag_id }))
    )
  }

  return NextResponse.json({ event: newEvent }, { status: 201 })
}
