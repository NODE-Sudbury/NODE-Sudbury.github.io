import { supabase } from '@/lib/supabase'
import { type Metadata } from 'next'
import SpeakersDirectory from './SpeakersDirectory'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Speakers',
  description: 'Community members who have spoken at NODE Sudbury events.',
}

export default async function SpeakersPage() {
  // Fetch all speakers from published/archived events
  const { data: rows } = await supabase
    .from('event_speakers')
    .select('id, name, title, company, bio, photo_url, talk_title, session_type, member_id, event:events(id, title, slug, status)')
    .in('events.status', ['published', 'archived'])
    .order('name')

  // Group by name + member_id (same person at multiple events = one card)
  const speakerMap = new Map<string, {
    key: string; name: string; title: string | null; company: string | null
    bio: string | null; photo_url: string | null; member_id: string | null
    talks: { event_title: string; event_slug: string; talk_title: string | null; session_type: string }[]
  }>()

  for (const row of rows ?? []) {
    const event = Array.isArray(row.event) ? row.event[0] : row.event
    if (!event) continue
    const key = row.member_id ?? `guest-${row.name}`
    if (!speakerMap.has(key)) {
      speakerMap.set(key, { key, name: row.name, title: row.title, company: row.company, bio: row.bio, photo_url: row.photo_url, member_id: row.member_id, talks: [] })
    }
    speakerMap.get(key)!.talks.push({ event_title: event.title, event_slug: event.slug, talk_title: row.talk_title, session_type: row.session_type })
  }

  const speakers = Array.from(speakerMap.values()).sort((a, b) => a.name.localeCompare(b.name))

  return <SpeakersDirectory speakers={speakers} />
}
