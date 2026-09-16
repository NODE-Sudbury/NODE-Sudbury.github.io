import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { data: chapters, error } = await supabase
    .from('chapters')
    .select('id, name, city, province, slug, description, logo_url, website_url, twitter_handle, instagram_handle, is_active, created_at')
    .eq('is_active', true)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Enrich with member + event counts
  const enriched = await Promise.all((chapters ?? []).map(async (chapter) => {
    const [{ count: memberCount }, { count: eventCount }] = await Promise.all([
      supabase.from('chapter_members').select('*', { count: 'exact', head: true }).eq('chapter_id', chapter.id),
      supabase.from('events').select('*', { count: 'exact', head: true })
        .eq('chapter_id', chapter.id)
        .in('status', ['published', 'archived']),
    ])
    return { ...chapter, member_count: memberCount ?? 0, event_count: eventCount ?? 0 }
  }))

  return NextResponse.json(enriched)
}
