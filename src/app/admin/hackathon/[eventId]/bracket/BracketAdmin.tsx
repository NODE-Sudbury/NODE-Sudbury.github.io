'use client'

import { useState } from 'react'

interface Team {
  id: string
  name: string
}

interface Entry {
  score: number
  seed: number | null
  advanced: boolean
  team_id: string
  hackathon_teams: Team | null
}

interface Round {
  id: string
  name: string
  round_order: number
  status: string
  max_advancing: number | null
  starts_at: string | null
  ends_at: string | null
  hackathon_round_teams: Entry[]
}

interface Props {
  event: { id: string; title: string }
  rounds: Round[]
  kickoffEvent?: { id: string; title: string } | null
}

type Tab = 'rounds' | 'populate' | 'results'

export default function BracketAdmin({ event, rounds: initialRounds, kickoffEvent }: Props) {
  const [tab, setTab] = useState<Tab>('rounds')
  const [rounds, setRounds] = useState(initialRounds)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const [newRound, setNewRound] = useState({ name: '', round_order: '', max_advancing: '' })
  const [scoreEdits, setScoreEdits] = useState<Record<string, string>>({})

  async function addRound() {
    if (!newRound.name) return
    setLoading(true)
    const res = await fetch(`/api/admin/bracket/${event.id}/rounds`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newRound.name,
        round_order: parseInt(newRound.round_order) || rounds.length + 1,
        max_advancing: newRound.max_advancing ? parseInt(newRound.max_advancing) : null,
      }),
    })
    if (res.ok) {
      setMsg('Round added')
      setNewRound({ name: '', round_order: '', max_advancing: '' })
      const data = await res.json()
      setRounds(prev => [...prev, { ...data, hackathon_round_teams: [] }])
    }
    setLoading(false)
  }

  async function deleteRound(roundId: string) {
    await fetch(`/api/admin/bracket/${event.id}/rounds/${roundId}`, { method: 'DELETE' })
    setRounds(prev => prev.filter(r => r.id !== roundId))
  }

  async function setStatus(roundId: string, status: string) {
    await fetch(`/api/admin/bracket/${event.id}/rounds/${roundId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    setRounds(prev => prev.map(r => r.id === roundId ? { ...r, status } : r))
  }

  async function populate(roundId: string, source: 'leaderboard' | 'manual', limit = 8) {
    setLoading(true)
    const res = await fetch(`/api/admin/bracket/${event.id}/rounds/${roundId}/populate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source, limit }),
    })
    const data = await res.json()
    setMsg(res.ok ? `Seeded ${data.seeded} teams` : data.error)
    setLoading(false)
  }

  async function saveScore(roundId: string, teamId: string) {
    const key = `${roundId}--${teamId}`
    const score = parseFloat(scoreEdits[key] ?? '0')
    await fetch(`/api/admin/bracket/${event.id}/entries/${roundId}--${teamId}/score`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ score }),
    })
    setRounds(prev => prev.map(r => r.id === roundId ? {
      ...r,
      hackathon_round_teams: r.hackathon_round_teams.map(e =>
        e.team_id === teamId ? { ...e, score } : e
      ),
    } : r))
  }

  async function completeRound(roundId: string) {
    setLoading(true)
    const res = await fetch(`/api/admin/bracket/${event.id}/rounds/${roundId}/complete`, { method: 'POST' })
    const data = await res.json()
    setMsg(res.ok ? `Round complete. ${data.advanced} teams advancing.` : data.error)
    setLoading(false)
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'rounds', label: 'Rounds' },
    { id: 'populate', label: 'Populate' },
    { id: 'results', label: 'Results' },
  ]

  return (
    <div className="min-h-screen bg-[#0b1120] text-[#d8e3f0] p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <p className="text-sm text-[#38bdf8] font-semibold uppercase tracking-widest mb-1">Admin - Bracket</p>
          <h1 className="text-xl font-bold">{event.title}</h1>
          <a href={`/hackathon/${event.id}/bracket`} target="_blank" className="text-xs text-[#38bdf8] hover:underline mt-1 inline-block">
            View public bracket
          </a>
        </div>

        {kickoffEvent && (
          <div className="mb-4 flex items-center gap-3 px-4 py-3 rounded-lg bg-[#111827] border border-[#1e3a5f] text-sm">
            <span className="text-[#5a6278]">Finals bracket for kickoff:</span>
            <a href={`/admin/hackathon/${kickoffEvent.id}`} className="text-[#7aa2f7] hover:underline font-medium">
              {kickoffEvent.title}
            </a>
          </div>
        )}

        {msg && <p className="mb-4 text-sm text-green-400 bg-green-500/10 border border-green-500/30 rounded-lg px-4 py-2">{msg}</p>}

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-[#111827] rounded-lg p-1 w-fit">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                tab === t.id ? 'bg-[#38bdf8] text-black' : 'text-[#6b7d96] hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Rounds tab */}
        {tab === 'rounds' && (
          <div className="space-y-4">
            {rounds.map(r => (
              <div key={r.id} className="bg-[#111827] border border-[#1e2d45] rounded-xl p-4 flex items-center justify-between gap-4">
                <div>
                  <p className="font-semibold">{r.name}</p>
                  <p className="text-xs text-[#5a6278]">Order: {r.round_order} &bull; Advancing: {r.max_advancing ?? 'All'} &bull; Teams: {r.hackathon_round_teams.length}</p>
                </div>
                <div className="flex gap-2 items-center">
                  <select
                    value={r.status}
                    onChange={e => setStatus(r.id, e.target.value)}
                    className="bg-[#1a2540] border border-[#1e2d45] rounded px-2 py-1 text-sm text-white"
                  >
                    <option value="pending">Pending</option>
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                  </select>
                  <button onClick={() => deleteRound(r.id)} className="text-xs text-red-400 hover:text-red-300 px-2 py-1">Delete</button>
                </div>
              </div>
            ))}

            <div className="bg-[#111827] border border-[#1e2d45] rounded-xl p-4 space-y-3">
              <h3 className="font-semibold text-sm">Add Round</h3>
              <div className="grid grid-cols-3 gap-3">
                <input
                  placeholder="Round name (e.g. Qualifying)"
                  value={newRound.name}
                  onChange={e => setNewRound(p => ({ ...p, name: e.target.value }))}
                  className="col-span-2 bg-[#1a2540] border border-[#1e2d45] rounded px-3 py-2 text-sm text-white"
                />
                <input
                  placeholder="Order (1,2,3)"
                  value={newRound.round_order}
                  onChange={e => setNewRound(p => ({ ...p, round_order: e.target.value }))}
                  className="bg-[#1a2540] border border-[#1e2d45] rounded px-3 py-2 text-sm text-white"
                />
                <input
                  placeholder="Max advancing (blank = all)"
                  value={newRound.max_advancing}
                  onChange={e => setNewRound(p => ({ ...p, max_advancing: e.target.value }))}
                  className="col-span-2 bg-[#1a2540] border border-[#1e2d45] rounded px-3 py-2 text-sm text-white"
                />
                <button
                  onClick={addRound}
                  disabled={loading || !newRound.name}
                  className="bg-[#38bdf8] hover:bg-sky-400 text-black font-bold rounded px-4 py-2 text-sm disabled:opacity-50"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Populate tab */}
        {tab === 'populate' && (
          <div className="space-y-4">
            {rounds.map(r => (
              <div key={r.id} className="bg-[#111827] border border-[#1e2d45] rounded-xl p-4">
                <p className="font-semibold mb-3">{r.name} <span className="text-xs text-[#5a6278]">({r.hackathon_round_teams.length} teams seeded)</span></p>
                <div className="flex gap-2">
                  <button
                    onClick={() => populate(r.id, 'leaderboard', 8)}
                    disabled={loading}
                    className="text-sm bg-[#38bdf8] hover:bg-sky-400 text-black font-semibold px-4 py-2 rounded-lg disabled:opacity-50"
                  >
                    Seed top 8 from leaderboard
                  </button>
                  <button
                    onClick={() => populate(r.id, 'leaderboard', 4)}
                    disabled={loading}
                    className="text-sm bg-[#1a2540] hover:bg-[#252b3a] text-white px-4 py-2 rounded-lg disabled:opacity-50 border border-[#1e2d45]"
                  >
                    Top 4
                  </button>
                </div>
                {r.hackathon_round_teams.length > 0 && (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {r.hackathon_round_teams.map(e => (
                      <div key={e.team_id} className="text-xs text-[#6b7d96] bg-[#0b1120] rounded px-2 py-1">
                        #{e.seed} {e.hackathon_teams?.name ?? e.team_id}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Results tab */}
        {tab === 'results' && (
          <div className="space-y-6">
            {rounds.map(r => (
              <div key={r.id} className="bg-[#111827] border border-[#1e2d45] rounded-xl p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">{r.name}</h3>
                  {r.status !== 'completed' && r.hackathon_round_teams.length > 0 && (
                    <button
                      onClick={() => completeRound(r.id)}
                      disabled={loading}
                      className="text-sm bg-green-500 hover:bg-green-400 text-black font-bold px-4 py-2 rounded-lg disabled:opacity-50"
                    >
                      Complete Round
                    </button>
                  )}
                  {r.status === 'completed' && <span className="text-xs text-sky-400 font-semibold">COMPLETED</span>}
                </div>
                <div className="space-y-2">
                  {r.hackathon_round_teams.length === 0 && (
                    <p className="text-xs text-[#5a6278] italic">No teams in this round yet</p>
                  )}
                  {[...r.hackathon_round_teams]
                    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
                    .map(e => {
                      const key = `${r.id}--${e.team_id}`
                      return (
                        <div key={e.team_id} className={`flex items-center gap-3 p-2 rounded-lg ${e.advanced ? 'bg-green-500/10' : 'bg-[#0b1120]'}`}>
                          <span className="text-xs text-[#5a6278] w-4">#{e.seed}</span>
                          <span className="flex-1 text-sm font-medium">{e.hackathon_teams?.name ?? 'Unknown'}</span>
                          {e.advanced && <span className="text-xs text-green-400">ADV</span>}
                          <input
                            type="number"
                            value={scoreEdits[key] ?? e.score ?? 0}
                            onChange={ev => setScoreEdits(p => ({ ...p, [key]: ev.target.value }))}
                            className="w-20 bg-[#1a2540] border border-[#1e2d45] rounded px-2 py-1 text-sm text-white text-right"
                            disabled={r.status === 'completed'}
                          />
                          {r.status !== 'completed' && (
                            <button
                              onClick={() => saveScore(r.id, e.team_id)}
                              className="text-xs text-[#38bdf8] hover:underline"
                            >
                              Save
                            </button>
                          )}
                        </div>
                      )
                    })
                  }
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
