import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function ProjectDetailPage({
  params,
}: {
  params: { slug: string; projectId: string }
}) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  const { data: event } = await supabase
    .from('events')
    .select('id, title, slug')
    .eq('slug', params.slug)
    .single()

  if (!event) notFound()

  const { data: sub } = await supabase
    .from('hackathon_submissions')
    .select(`
      id, title, description, repo_url, demo_url, deck_url,
      screenshot_urls, prize_tracks, sub_status, created_at,
      hackathon_teams (
        id, name,
        hackathon_team_members ( member_id, is_lead, members ( full_name, avatar_url ) )
      )
    `)
    .eq('id', params.projectId)
    .eq('event_id', event.id)
    .single()

  if (!sub) notFound()

  const team = sub.hackathon_teams as unknown as {
    id: string
    name: string
    hackathon_team_members: Array<{
      member_id: string
      is_lead: boolean
      members: { full_name: string; avatar_url: string | null } | null
    }>
  } | null

  const { data: scores } = await supabase
    .from('judging_scores')
    .select('score')
    .eq('submission_id', sub.id)

  const avg =
    scores && scores.length > 0
      ? scores.reduce((a, b) => a + b.score, 0) / scores.length
      : null

  return (
    <div className="min-h-screen bg-[#0b0e14] py-10 px-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-8 text-xs">
          <Link href="/events" className="text-[#5a6278] hover:text-[#c9d1e8]">Events</Link>
          <span className="text-[#3a3f52]">/</span>
          <Link href={`/events/${event.slug}`} className="text-[#5a6278] hover:text-[#c9d1e8]">{event.title}</Link>
          <span className="text-[#3a3f52]">/</span>
          <Link href={`/events/${event.slug}/projects`} className="text-[#5a6278] hover:text-[#c9d1e8]">Projects</Link>
          <span className="text-[#3a3f52]">/</span>
          <span className="text-[#c9d1e8] truncate max-w-[160px]">{sub.title}</span>
        </div>

        {sub.screenshot_urls && sub.screenshot_urls[0] && (
          <div className="mb-6 rounded-xl overflow-hidden bg-[#111520] max-h-80">
            <img src={sub.screenshot_urls[0]} alt={sub.title} className="w-full object-cover" />
          </div>
        )}

        <h1 className="text-3xl font-bold text-[#e2e8f0] mb-2">{sub.title}</h1>
        {team && <p className="text-sm text-[#7aa2f7] mb-4">by {team.name}</p>}

        {avg !== null && (
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1a2a10] border border-[#2a4020] text-[#9ece6a] text-sm mb-6">
            Avg score: {avg.toFixed(1)}
          </div>
        )}

        {sub.prize_tracks && sub.prize_tracks.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {(sub.prize_tracks as string[]).map((t) => (
              <span key={t} className="text-xs px-3 py-1 rounded-full bg-[#1a2035] text-[#7aa2f7] border border-[#2a3558]">
                {t}
              </span>
            ))}
          </div>
        )}

        {sub.description && (
          <div className="mb-6">
            <h2 className="text-xs font-semibold text-[#5a6278] uppercase tracking-wider mb-2">Description</h2>
            <p className="text-[#8892b0] leading-relaxed whitespace-pre-wrap">{sub.description}</p>
          </div>
        )}

        <div className="flex flex-wrap gap-3 mb-8">
          {sub.demo_url && (
            <a
              href={sub.demo_url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-lg bg-[#1a2035] text-[#7aa2f7] text-sm border border-[#2a3558] hover:border-[#7aa2f7] transition-colors"
            >
              Live Demo
            </a>
          )}
          {sub.repo_url && (
            <a
              href={sub.repo_url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-lg bg-[#1a2035] text-[#c9d1e8] text-sm border border-[#2a3558] hover:border-[#7aa2f7] transition-colors"
            >
              Repository
            </a>
          )}
          {sub.deck_url && (
            <a
              href={sub.deck_url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-lg bg-[#1a2035] text-[#c9d1e8] text-sm border border-[#2a3558] hover:border-[#7aa2f7] transition-colors"
            >
              Slides
            </a>
          )}
        </div>

        {team && team.hackathon_team_members && team.hackathon_team_members.length > 0 && (
          <div>
            <h2 className="text-xs font-semibold text-[#5a6278] uppercase tracking-wider mb-3">Team</h2>
            <div className="flex flex-wrap gap-3">
              {team.hackathon_team_members.map((tm) => (
                <div
                  key={tm.member_id}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#111520] border border-[#1e2235]"
                >
                  {tm.members?.avatar_url && (
                    <img
                      src={tm.members.avatar_url}
                      alt={tm.members.full_name}
                      className="w-7 h-7 rounded-full object-cover"
                    />
                  )}
                  <span className="text-sm text-[#c9d1e8]">{tm.members?.full_name}</span>
                  {tm.is_lead && (
                    <span className="text-[10px] text-[#e0af68]">Lead</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
