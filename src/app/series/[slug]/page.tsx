import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function SeriesPage({ params }: { params: { slug: string } }) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  const { data: series } = await supabase
    .from('event_series')
    .select('id, title, description, slug')
    .eq('slug', params.slug)
    .single()

  if (!series) notFound()

  const { data: events } = await supabase
    .from('events')
    .select('id, title, slug, starts_at, ends_at, status, type, cover_image_url')
    .eq('series_id', series.id)
    .order('starts_at', { ascending: false })

  return (
    <div className="min-h-screen bg-[#0b0e14] py-10 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-8 text-xs">
          <Link href="/events" className="text-[#5a6278] hover:text-[#c9d1e8]">Events</Link>
          <span className="text-[#3a3f52]">/</span>
          <span className="text-[#c9d1e8]">{series.title}</span>
        </div>

        <h1 className="text-3xl font-bold text-[#e2e8f0] mb-3">{series.title}</h1>
        {series.description && (
          <p className="text-[#8892b0] mb-8 max-w-2xl">{series.description}</p>
        )}

        {(!events || events.length === 0) && (
          <div className="text-center py-16 text-[#5a6278]">No events in this series yet.</div>
        )}

        <div className="space-y-3">
          {(events ?? []).map((ev) => {
            const date = new Date(ev.starts_at)
            const isPast = date < new Date()
            return (
              <Link
                key={ev.id}
                href={`/events/${ev.slug}`}
                className="flex items-center gap-4 p-4 rounded-xl border border-[#1e2235] bg-[#111520] hover:border-[#7aa2f7] transition-colors group"
              >
                <div className="flex-shrink-0 w-14 text-center">
                  <div className="text-xs text-[#5a6278]">
                    {date.toLocaleString('default', { month: 'short' })}
                  </div>
                  <div className="text-xl font-bold text-[#c9d1e8]">{date.getDate()}</div>
                  <div className="text-xs text-[#5a6278]">{date.getFullYear()}</div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-[#c9d1e8] group-hover:text-[#7aa2f7] transition-colors truncate">
                    {ev.title}
                  </div>
                  <div className="text-xs text-[#5a6278] mt-0.5 capitalize">{ev.type}</div>
                </div>
                <div className="flex-shrink-0">
                  <StatusBadge status={ev.status} isPast={isPast} />
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ status, isPast }: { status: string; isPast: boolean }) {
  if (isPast) return <span className="text-xs px-2 py-0.5 rounded-full bg-[#1a2035] text-[#5a6278] border border-[#2a3558]">Past</span>
  if (status === 'published') return <span className="text-xs px-2 py-0.5 rounded-full bg-[#1a2a10] text-[#9ece6a] border border-[#2a4020]">Open</span>
  if (status === 'draft') return <span className="text-xs px-2 py-0.5 rounded-full bg-[#1a1a0e] text-[#e0af68] border border-[#3a3010]">Soon</span>
  return <span className="text-xs px-2 py-0.5 rounded-full bg-[#1a2035] text-[#5a6278] border border-[#2a3558]">{status}</span>
}
