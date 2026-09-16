import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function MySubmissionsPage() {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const { data: teamMembers } = await supabase
    .from('hackathon_team_members')
    .select(`
      is_lead,
      hackathon_teams (
        id, name, event_id,
        hackathon_submissions (
          id, title, sub_status, prize_tracks, is_finalist, created_at
        ),
        events ( id, title, slug, starts_at )
      )
    `)
    .eq('member_id', session.user.id)

  return (
    <div className="min-h-screen bg-[#0b0e14] py-10 px-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-8 text-xs">
          <Link href="/dashboard" className="text-[#5a6278] hover:text-[#c9d1e8]">Dashboard</Link>
          <span className="text-[#3a3f52]">/</span>
          <span className="text-[#c9d1e8]">My Submissions</span>
        </div>

        <h1 className="text-2xl font-bold text-[#e2e8f0] mb-6">My Hackathon Submissions</h1>

        {(!teamMembers || teamMembers.length === 0) && (
          <div className="text-center py-20 text-[#5a6278]">
            No hackathon submissions yet.
            <br />
            <Link href="/events" className="mt-2 inline-block text-[#7aa2f7] hover:underline text-sm">
              Browse events
            </Link>
          </div>
        )}

        <div className="space-y-3">
          {(teamMembers ?? []).map((tm) => {
            const team = tm.hackathon_teams as unknown as {
              id: string
              name: string
              hackathon_submissions: Array<{
                id: string
                title: string
                sub_status: string
                prize_tracks: string[] | null
                is_finalist: boolean
              }>
              events: { id: string; title: string; slug: string; starts_at: string } | null
            } | null
            if (!team) return null
            const submissions = team.hackathon_submissions ?? []
            const ev = team.events

            return (
              <div
                key={team.id}
                className="p-4 rounded-xl border border-[#1e2235] bg-[#111520]"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="font-semibold text-[#c9d1e8]">{team.name}</div>
                    {ev && (
                      <Link
                        href={`/events/${ev.slug}`}
                        className="text-xs text-[#7aa2f7] hover:underline"
                      >
                        {ev.title}
                      </Link>
                    )}
                  </div>
                  {tm.is_lead && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-[#1a1a0e] text-[#e0af68] border border-[#3a3010]">Lead</span>
                  )}
                </div>

                {submissions.length === 0 && (
                  <p className="text-xs text-[#3a3f52]">No submission yet for this team.</p>
                )}

                {submissions.map((sub) => (
                  <div key={sub.id} className="flex items-center gap-3 mt-2">
                    <div className="flex-1">
                      <Link
                        href={ev ? `/events/${ev.slug}/projects/${sub.id}` : '#'}
                        className="text-sm font-medium text-[#c9d1e8] hover:text-[#7aa2f7] transition-colors"
                      >
                        {sub.title}
                      </Link>
                      {sub.prize_tracks && sub.prize_tracks.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {sub.prize_tracks.map((t) => (
                            <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-[#1a2035] text-[#7aa2f7] border border-[#2a3558]">
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {sub.is_finalist && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-[#1a1a0e] text-[#e0af68] border border-[#3a3010]">Finalist</span>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${
                        sub.sub_status === 'submitted'
                          ? 'bg-[#1a2a10] text-[#9ece6a] border-[#2a4020]'
                          : 'bg-[#1a2035] text-[#5a6278] border-[#2a3558]'
                      }`}>
                        {sub.sub_status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
