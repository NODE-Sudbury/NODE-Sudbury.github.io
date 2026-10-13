import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export const dynamic = 'force-dynamic'

export default async function HackathonResultsPage({ params }: { params: { eventId: string } }) {
  const { eventId } = params

  const { data: event } = await supabase
    .from('events')
    .select('id, title, type, status')
    .eq('id', eventId)
    .eq('type', 'hackathon')
    .single()
  if (!event) notFound()

  if (event.status === 'draft') notFound()

  const { data: leaderboard } = await supabase
    .from('hackathon_leaderboard')
    .select('*')
    .eq('event_id', eventId)
    .order('total_score', { ascending: false })

  const results = leaderboard ?? []
  const isPublished = event.status === 'archived' || results.length > 0

  const MEDALS: Record<number, string> = { 1: '1st', 2: '2nd', 3: '3rd' }

  return (
    <div className="min-h-screen bg-[#0b0e14] text-[#c9d1e8]">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold text-[#f0e6d3]">{event.title}</h1>
          <p className="text-[#5a6278] mt-2">Hackathon Results</p>
        </div>

        {!isPublished && (
          <div className="text-center py-20 space-y-2">
            <p className="text-2xl">Judging in progress</p>
            <p className="text-[#5a6278] text-sm">Results will be published once judging is complete.</p>
          </div>
        )}

        {isPublished && results.length === 0 && (
          <p className="text-center text-[#5a6278] py-20">No scored submissions yet.</p>
        )}

        {isPublished && results.length > 0 && (
          <div className="space-y-4">
            {results.map((row: any, idx: number) => {
              const rank = idx + 1
              return (
                <Card key={row.team_id ?? row.submission_id}
                  className={`border transition-colors ${rank === 1 ? 'bg-[#1a1f2c] border-[#f0e6d3]/30' : 'bg-[#13161f] border-[#252b3a]'}`}>
                  <CardContent className="p-5 flex items-center gap-5">
                    <div className="w-10 text-center shrink-0">
                      {rank <= 3 ? (
                        <span className={`text-lg font-bold ${rank === 1 ? 'text-yellow-400' : rank === 2 ? 'text-slate-300' : 'text-amber-600'}`}>
                          {MEDALS[rank]}
                        </span>
                      ) : (
                        <span className="text-[#5a6278] text-sm font-mono">#{rank}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[#f0e6d3] truncate">{row.submission_title ?? 'Untitled'}</p>
                      <p className="text-sm text-[#5a6278]">{row.team_name ?? 'Unknown team'}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-2xl font-bold font-mono text-[#f0e6d3]">{row.total_score ?? 0}</p>
                      <p className="text-xs text-[#5a6278]">{row.judge_count ?? 0} judge{row.judge_count !== 1 ? 's' : ''}</p>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
