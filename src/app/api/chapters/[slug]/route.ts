import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const { data: chapter, error } = await supabase
    .from('chapters')
    .select('id, name, city, province, slug, description, logo_url, website_url, twitter_handle, instagram_handle, is_active, created_at')
    .eq('slug', params.slug)
    .eq('is_active', true)
    .single()

  if (error || !chapter) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const [{ data: events }, { data: boardMembers }, { count: memberCount }] = await Promise.all([
    supabase.from('events')
      .select('id, title, slug, type, status, starts_at, ends_at, location:event_locations(name, city, is_virtual)')
      .eq('chapter_id', chapter.id)
      .in('status', ['published'])
      .gte('starts_at', new Date().toISOString())
      .order('starts_at', { ascending: true })
      .limit(10),
    supabase.from('chapter_members')
      .select('role, joined_at, member:members(id, display_name, avatar_url, bio)')
      .eq('chapter_id', chapter.id)
      .in('role', ['board', 'organizer'])
      .order('joined_at', { ascending: true }),
    supabase.from('chapter_members').select('*', { count: 'exact', head: true }).eq('chapter_id', chapter.id),
  ])

  return NextResponse.json({
    chapter,
    events: events ?? [],
    board_members: boardMembers ?? [],
    member_count: memberCount ?? 0,
  })
}
