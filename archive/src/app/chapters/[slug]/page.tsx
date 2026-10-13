import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import { type Metadata } from 'next'
import ChapterDetail from './ChapterDetail'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const { data } = await supabase
    .from('chapters').select('name, description').eq('slug', params.slug).single()
  if (!data) return {}
  return { title: data.name, description: data.description ?? undefined }
}

export default async function ChapterPage({ params }: { params: { slug: string } }) {
  const { data: chapter } = await supabase
    .from('chapters')
    .select('id, name, city, province, slug, description, logo_url, website_url, twitter_handle, instagram_handle, created_at')
    .eq('slug', params.slug)
    .eq('is_active', true)
    .single()

  if (!chapter) notFound()

  const [{ data: events }, { data: boardMembers }, { count: memberCount }, { count: eventCount }] =
    await Promise.all([
      supabase.from('events')
        .select('id, title, slug, type, status, starts_at, ends_at, location:event_locations(name, city, is_virtual)')
        .eq('chapter_id', chapter.id)
        .eq('status', 'published')
        .gte('starts_at', new Date().toISOString())
        .order('starts_at', { ascending: true })
        .limit(10),
      supabase.from('chapter_members')
        .select('role, joined_at, member:members(id, display_name, avatar_url, bio)')
        .eq('chapter_id', chapter.id)
        .in('role', ['board', 'organizer']),
      supabase.from('chapter_members').select('*', { count: 'exact', head: true }).eq('chapter_id', chapter.id),
      supabase.from('events').select('*', { count: 'exact', head: true })
        .eq('chapter_id', chapter.id).in('status', ['published', 'archived']),
    ])

  return (
    <ChapterDetail
      chapter={chapter}
      events={(events ?? []) as any}
      boardMembers={(boardMembers ?? []) as any}
      memberCount={memberCount ?? 0}
      eventCount={eventCount ?? 0}
    />
  )
}
