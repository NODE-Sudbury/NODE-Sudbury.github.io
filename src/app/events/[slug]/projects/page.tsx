import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function ProjectGalleryPage({ params }: { params: { slug: string } }) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  const { data: event } = await supabase
    .from('events')
    .select('id, title, slug, results_announced_at, submission_deadline')
    .eq('slug', params.slug)
    .single()

  if (!event) notFound()

  const { data: submissions } = await supabase
    .from('hackathon_submissions')
    .select(`
      id, title, description, repo_url, demo_url, screenshot_urls,
      prize_tracks, sub_status, created_at,
      hackathon_teams ( id, name )
    `)
    .eq('event_id', event.id)
    .eq('sub_status', 'submitted')
    .order('created_at', { ascending: true })

  const { data: scores } = await supabase
    .from('judging_scores')
    .select('submission_id, score')
    .eq('event_id', event.id)

  const scoreMap: Record<string, number[]> = {}
  for (const s of scores ?? []) {
    if (!scoreMap[s.submission_id]) scoreMap[s.submission_id] = []
    scoreMap[s.submission_id].push(s.score)
  }
  const avgScore = (id: string) => {
    const arr = scoreMap[id] ?? []
    if (!arr.length) return 0
    return arr.reduce((a, b) => a + b, 0) / arr.length
  }

  const resultsPublished = event.results_announced_at
    ? new Date(event.results_announced_at) <= new Date()
    : false

  const sorted = [...(submissions ?? [])].sort((a, b) => {
    if (resultsPublished) return avgScore(b.id) - avgScore(a.id)
    return 0
  })

  return (
    <div className="min-h-screen bg-[#0b0e14] py-10 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-8 text-xs">
          <Link href="/events" className="text-[#5a6278] hover:text-[#c9d1e8]">Events</Link>
          <span className="text-[#3a3f52]">/</span>
          <Link href={`/events/${event.slug}`} className="text-[#5a6278] hover:text-[#c9d1e8]">{event.title}</Link>
          <span className="text-[#3a3f52]">/</span>
          <span className="text-[#c9d1e8]">Projects</span>
        </div>

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-[#e2e8f0]">Project Gallery</h1>
          {!resultsPublished && event.results_announced_at && (
            <span className="text-xs px-3 py-1 rounded-full bg-[#1a2035] text-[#7aa2f7] border border-[#2a3558]">
              Results on {new Date(event.results_announced_at).toLocaleDateString()}
            </span>
          )}
        </div>

        {(!submissions || submissions.length === 0) && (
          <div className="text-center py-20 text-[#5a6278]">No projects submitted yet.</div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((sub) => {
            const avg = avgScore(sub.id)
            const isTop = resultsPublished && avg > 0 && sorted.indexOf(sub) === 0
            const team = sub.hackathon_teams as unknown as { id: string; name: string } | null
            return (
              <Link
                key={sub.id}
                href={`/events/${event.slug}/projects/${sub.id}`}
                className={`block rounded-xl border p-5 hover:border-[#7aa2f7] transition-colors ${
                  isTop
                    ? 'border-[#e0af68] bg-[#1a1a0e]'
                    : 'border-[#1e2235] bg-[#111520]'
                }`}
              >
                {isTop && (
                  <div className="mb-3 text-xs font-semibold text-[#e0af68] uppercase tracking-wide">
                    Winner
                  </div>
                )}
                {sub.screenshot_urls && sub.screenshot_urls[0] && (
                  <div className="mb-3 h-36 rounded-lg overflow-hidden bg-[#0b0e14]">
                    <img
                      src={sub.screenshot_urls[0]}
                      alt={sub.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <h2 className="font-semibold text-[#e2e8f0] mb-1 line-clamp-2">{sub.title}</h2>
                {team && <p className="text-xs text-[#7aa2f7] mb-2">{team.name}</p>}
                {sub.description && (
                  <p className="text-xs text-[#8892b0] line-clamp-3 mb-3">{sub.description}</p>
                )}
                {sub.prize_tracks && sub.prize_tracks.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {(sub.prize_tracks as string[]).map((t) => (
                      <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-[#1a2035] text-[#7aa2f7] border border-[#2a3558]">
                        {t}
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-3 mt-auto text-xs text-[#5a6278]">
                  {sub.demo_url && <span>Demo</span>}
                  {sub.repo_url && <span>Repo</span>}
                  {resultsPublished && avg > 0 && (
                    <span className="ml-auto text-[#9ece6a]">{avg.toFixed(1)} avg</span>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
