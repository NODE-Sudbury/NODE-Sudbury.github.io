'use client'

interface TeamEntry {
  score: number
  seed: number | null
  advanced: boolean
  team_id: string
  hackathon_teams: { id: string; name: string }[] | { id: string; name: string } | null
}

interface Round {
  id: string
  name: string
  round_order: number
  status: string
  max_advancing: number | null
  starts_at: string | null
  ends_at: string | null
  hackathon_round_teams: TeamEntry[]
}

interface Props {
  rounds: Round[]
  eventId: string
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-gray-700 text-gray-300',
  active: 'bg-green-500/20 text-green-400 animate-pulse',
  completed: 'bg-sky-500/20 text-sky-400',
}

export default function BracketClient({ rounds }: Props) {
  if (rounds.length === 0) {
    return (
      <div className="text-center py-24 text-[#5a6278]">
        <p className="text-lg">Bracket not yet set up</p>
        <p className="text-sm mt-2">Check back once the organizer configures the rounds.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-6 min-w-max pb-4">
        {rounds.map((round) => {
          const entries = [...(round.hackathon_round_teams ?? [])].sort((a, b) => (a.seed ?? 99) - (b.seed ?? 99))
          return (
            <div key={round.id} className="w-56 flex-shrink-0">
              {/* Round header */}
              <div className="flex items-center gap-2 mb-4">
                <h2 className="font-bold text-sm text-white">{round.name}</h2>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLES[round.status] ?? STATUS_STYLES.pending}`}>
                  {round.status === 'active' ? 'LIVE' : round.status.toUpperCase()}
                </span>
              </div>

              {/* Entry cards */}
              <div className="flex flex-col gap-2">
                {entries.length === 0 ? (
                  <p className="text-xs text-[#5a6278] italic">No teams seeded yet</p>
                ) : (
                  entries.map((entry) => {
                    const teamObj = Array.isArray(entry.hackathon_teams) ? entry.hackathon_teams[0] : entry.hackathon_teams
                    const name = teamObj?.name ?? 'Unknown Team'
                    const advancing = entry.advanced
                    const eliminated = round.status === 'completed' && !advancing

                    return (
                      <div
                        key={entry.team_id}
                        className={`rounded-lg border p-3 text-sm transition-colors ${
                          advancing
                            ? 'border-green-500/40 bg-green-500/10'
                            : eliminated
                            ? 'border-gray-700 bg-gray-800/50 opacity-50'
                            : 'border-[#1e2d45] bg-[#111827]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            {entry.seed && (
                              <span className="text-[10px] text-[#5a6278] flex-shrink-0">#{entry.seed}</span>
                            )}
                            <span className="font-medium text-white truncate">{name}</span>
                          </div>
                          {advancing && (
                            <span className="text-[10px] text-green-400 flex-shrink-0">ADV</span>
                          )}
                        </div>
                        {round.status !== 'pending' && (
                          <p className="text-[11px] text-[#38bdf8] mt-1 font-mono">
                            Score: {entry.score ?? 0}
                          </p>
                        )}
                      </div>
                    )
                  })
                )}
              </div>

              {/* Advancing count note */}
              {round.max_advancing && (
                <p className="text-[11px] text-[#5a6278] mt-3">
                  Top {round.max_advancing} advance
                </p>
              )}
            </div>
          )
        })}

        {/* Winner display */}
        {rounds.length > 0 && rounds[rounds.length - 1].status === 'completed' && (() => {
          const finalRound = rounds[rounds.length - 1]
          const winner = (finalRound.hackathon_round_teams ?? []).find(e => e.advanced)
          if (!winner) return null
          const wt = Array.isArray(winner.hackathon_teams) ? winner.hackathon_teams[0] : winner.hackathon_teams
          return (
            <div className="w-48 flex-shrink-0 flex flex-col items-center justify-center">
              <div className="text-4xl mb-2">🏆</div>
              <p className="text-xs text-[#38bdf8] font-semibold uppercase tracking-widest mb-1">Winner</p>
              <p className="font-bold text-white text-center">{wt?.name ?? 'Champion'}</p>
            </div>
          )
        })()}
      </div>
    </div>
  )
}
