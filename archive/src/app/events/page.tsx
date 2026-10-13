import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { type Metadata } from 'next'
import { createServiceClient } from '@/lib/supabase'
import EventsClient from './EventsClient'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Events',
  description: 'Browse upcoming NODE Sudbury events - meetups, workshops, hackathons, and more for the Northern Ontario tech community.',
}

export default async function EventsPage() {
  const cookieStore = cookies()
  const authClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  const { data: { session } } = await authClient.auth.getSession()
  let isBoard = false
  if (session) {
    const { data: member } = await authClient.from('members').select('role').eq('id', session.user.id).single()
    isBoard = ['board', 'admin', 'super_admin'].includes(member?.role ?? '')
  }

  const db = isBoard ? createServiceClient() : authClient
  const statusFilter = isBoard ? ['published', 'archived', 'draft'] : ['published', 'archived']

  const [{ data: events }, { data: chapters }] = await Promise.all([
    db
      .from('events')
      .select(`
        id, title, slug, description, short_description,
        type, status, starts_at, ends_at, max_capacity,
        chapter_id, is_featured, thumbnail_url, cover_image_url, attendance_mode,
        location:event_locations(name, city, is_virtual),
        ticket_types(pricing_model, price_cents),
        registrations(id)
      `)
      .in('status', statusFilter)
      .is('deleted_at', null)
      .order('starts_at', { ascending: false }),
    db
      .from('chapters')
      .select('id, name, slug')
      .eq('is_active', true)
      .order('created_at', { ascending: true }),
  ])

  return (
    <EventsClient
      events={(events ?? []) as any}
      chapters={(chapters ?? []) as any}
      isBoard={isBoard}
    />
  )
}
