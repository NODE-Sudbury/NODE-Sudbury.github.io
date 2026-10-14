import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { type Metadata } from 'next'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Chapters',
  description: 'NODE chapters across Northern Ontario and beyond.',
}

export default async function ChaptersPage() {
  const { data: chapters } = await supabase
    .from('chapters')
    .select('id, name, city, province, slug, description, logo_url, is_active, created_at')
    .eq('is_active', true)
    .order('created_at', { ascending: true })

  const enriched = await Promise.all((chapters ?? []).map(async (c) => {
    const [{ count: mc }, { count: ec }] = await Promise.all([
      supabase.from('chapter_members').select('*', { count: 'exact', head: true }).eq('chapter_id', c.id),
      supabase.from('events').select('*', { count: 'exact', head: true })
        .eq('chapter_id', c.id).in('status', ['published', 'archived']),
    ])
    return { ...c, member_count: mc ?? 0, event_count: ec ?? 0 }
  }))

  return (
    <div className="min-h-screen bg-[#0b0e14] text-[#c9d1e8]">
      <div className="border-b border-[#252b3a] px-6 py-3 flex items-center gap-3">
        <Link href="/" className="text-sm font-bold tracking-widest text-[#f0e6d3]">NODE</Link>
        <span className="text-[#3a3f52]">/</span>
        <span className="text-sm text-[#5a6278]">Chapters</span>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-2xl font-semibold text-white mb-2">Chapters</h1>
        <p className="text-sm text-[#5a6278] mb-10">NODE communities across the region</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {enriched.map(chapter => (
            <Link
              key={chapter.id}
              href={chapter.slug ? `/chapters/${chapter.slug}` : '#'}
              className="group block bg-[#13161e] border border-[#252b3a] rounded-xl p-6 hover:border-[#f0e6d3]/30 transition-colors"
            >
              <div className="flex items-start gap-4">
                {chapter.logo_url ? (
                  <img src={chapter.logo_url} alt={chapter.name} className="w-12 h-12 rounded-lg object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-[#1e2330] flex items-center justify-center text-lg font-bold text-[#f0e6d3]">
                    {chapter.name[0]}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h2 className="text-base font-semibold text-white group-hover:text-[#f0e6d3] transition-colors">
                    {chapter.name}
                  </h2>
                  <p className="text-xs text-[#5a6278] mt-0.5">{chapter.city}, {chapter.province}</p>
                  {chapter.description && (
                    <p className="text-sm text-[#7a8398] mt-2 line-clamp-2">{chapter.description}</p>
                  )}
                  <div className="flex gap-4 mt-3 text-xs text-[#5a6278]">
                    <span>{chapter.member_count} members</span>
                    <span>{chapter.event_count} events</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
