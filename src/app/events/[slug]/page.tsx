import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import { type Metadata } from 'next'
import { createServiceClient } from '@/lib/supabase'
import EventDetail from './EventDetail'

export const dynamic = 'force-dynamic'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://nodesudbury.com'

async function getBoardStatus() {
  const cookieStore = cookies()
  const authClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
  const { data: { session } } = await authClient.auth.getSession()
  if (!session) return { isBoard: false, db: authClient }
  const { data: member } = await authClient.from('members').select('role').eq('id', session.user.id).single()
  const isBoard = ['board', 'admin', 'super_admin'].includes(member?.role ?? '')
  const db = isBoard ? createServiceClient() : authClient
  return { isBoard, db }
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const { db } = await getBoardStatus()
  const { data: event } = await db
    .from('events')
    .select('title, description, starts_at, cover_image_url')
    .eq('slug', params.slug)
    .is('deleted_at', null)
    .single()

  if (!event) return {}

  const url = `${APP_URL}/events/${params.slug}`
  const description = (event.description ?? `Join us at ${event.title}`).slice(0, 160)
  const image = event.cover_image_url ?? `${APP_URL}/opengraph-image`

  return {
    title: event.title,
    description,
    openGraph: {
      title: event.title,
      description,
      url,
      type: 'website',
      images: [{ url: image, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title: event.title,
      description,
      images: [image],
    },
  }
}

export default async function EventDetailPage({ params, searchParams }: { params: { slug: string }; searchParams?: { registration?: string } }) {
  const { isBoard, db } = await getBoardStatus()

  const { data: event } = await db
    .from('events')
    .select(`
      id, title, slug, description, short_description,
      type, status, starts_at, ends_at, max_capacity,
      is_featured, thumbnail_url, cover_image_url, attendance_mode,
      chapter_id,
      location:event_locations(name, address, city, province, is_virtual, join_link_visibility),
      ticket_types(id, name, description, pricing_model, price_cents, quantity_available, quantity_sold, is_active),
      registrations(id),
      event_sessions(id, title, starts_at, ends_at, room),
      event_tag_links(tag:event_tags(name, color))
    `)
    .eq('slug', params.slug)
    .is('deleted_at', null)
    .single()

  if (!event) notFound()

  // Non-board users cannot see draft events
  if (!isBoard && !['published', 'archived'].includes(event.status)) notFound()

  const [{ data: whiteboards }, { data: hunt }, { data: speakers }, { data: mentors }, { data: tiers }] = await Promise.all([
    db.from('whiteboard_sessions').select('id, title').eq('event_id', event.id).eq('is_active', true),
    db.from('scavenger_hunts').select('id, title').eq('event_id', event.id).eq('is_active', true).maybeSingle(),
    db.from('event_speakers').select('id, name, title, company, bio, photo_url, talk_title, session_type, display_order').eq('event_id', event.id).order('display_order'),
    db.from('event_mentors').select('id, name, title, company, bio, avatar_url, expertise_tags, sort_order').eq('event_id', event.id).order('sort_order'),
    db.from('ticket_tiers').select('id, name, price_cents, capacity, description, is_active, sort_order').eq('event_id', event.id).eq('is_active', true).order('sort_order'),
  ])

  return (
    <>
      {isBoard && event.status === 'draft' && (
        <div className="sticky top-0 z-50 bg-yellow-500 text-black text-sm font-medium text-center py-2 px-4">
          Draft Preview - this event is not yet published and is only visible to board members
        </div>
      )}
      <EventDetail event={event as any} searchboards={whiteboards ?? []} activeHunt={hunt ?? null} speakers={speakers ?? []} mentors={mentors ?? []} ticketTiers={tiers ?? []} searchParams={searchParams} />
    </>
  )
}
