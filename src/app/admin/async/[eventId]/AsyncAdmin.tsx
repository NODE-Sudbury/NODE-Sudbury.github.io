'use client'

import { useState } from 'react'

interface Challenge {
  id: string
  title: string
  description: string | null
  submission_type: string
  submissions_open_at: string | null
  submissions_close_at: string | null
  results_at: string | null
  allow_updates: boolean
  max_submissions_per_member: number
}

interface Submission {
  id: string
  title: string
  status: string
  score: number | null
  reviewer_notes: string | null
  submitted_at: string | null
  members: { display_name: string } | null
  async_challenges: { title: string } | null
}

interface Props {
  eventId: string
  initialChallenges: Challenge[]
  initialSubmissions: Submission[]
}

const SUBMISSION_TYPES = ['url', 'github', 'text', 'file_url']
const STATUSES = ['draft', 'submitted', 'reviewed', 'winner', 'honourable_mention']

export function AsyncAdmin({ eventId, initialChallenges, initialSubmissions }: Props) {
  const [tab, setTab] = useState<'challenges' | 'submissions'>('challenges')
  const [challenges, setChallenges] = useState(initialChallenges)
  const [submissions, setSubmissions] = useState(initialSubmissions)
  const [statusFilter, setStatusFilter] = useState('')
  const [newChallenge, setNewChallenge] = useState({
    title: '', description: '', submission_type: 'url',
    submissions_open_at: '', submissions_close_at: '', results_at: '',
    allow_updates: true, max_submissions_per_member: 1,
  })

  const createChallenge = async () => {
    const res = await fetch(`/api/admin/async/${eventId}/challenges`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newChallenge),
    })
    if (res.ok) {
      const c = await res.json()
      setChallenges(prev => [...prev, c])
      setNewChallenge({ title: '', description: '', submission_type: 'url', submissions_open_at: '', submissions_close_at: '', results_at: '', allow_updates: true, max_submissions_per_member: 1 })
    }
  }

  const deleteChallenge = async (id: string) => {
    await fetch(`/api/admin/async/${eventId}/challenges/${id}`, { method: 'DELETE' })
    setChallenges(prev => prev.filter(c => c.id !== id))
  }

  const updateSubmission = async (id: string, updates: Partial<Submission>) => {
    const res = await fetch(`/api/admin/async/${eventId}/submissions/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    if (res.ok) {
      const updated = await res.json()
      setSubmissions(prev => prev.map(s => s.id === id ? { ...s, ...updated } : s))
    }
  }

  const filtered = statusFilter ? submissions.filter(s => s.status === statusFilter) : submissions

  return (
    <div>
      <div className="flex gap-2 mb-6">
        {(['challenges', 'submissions'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize ${tab === t ? 'bg-sky-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'challenges' && (
        <div className="space-y-6">
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Add Challenge</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input value={newChallenge.title} onChange={e => setNewChallenge(p => ({ ...p, title: e.target.value }))} placeholder="Title" className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-sky-500" />
              <select value={newChallenge.submission_type} onChange={e => setNewChallenge(p => ({ ...p, submission_type: e.target.value }))} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-sky-500">
                {SUBMISSION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <textarea value={newChallenge.description} onChange={e => setNewChallenge(p => ({ ...p, description: e.target.value }))} placeholder="Description" rows={2} className="md:col-span-2 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm resize-none focus:outline-none focus:border-sky-500" />
              <div><label className="text-xs text-gray-400 block mb-1">Opens at</label><input type="datetime-local" value={newChallenge.submissions_open_at} onChange={e => setNewChallenge(p => ({ ...p, submissions_open_at: e.target.value }))} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-sky-500" /></div>
              <div><label className="text-xs text-gray-400 block mb-1">Closes at</label><input type="datetime-local" value={newChallenge.submissions_close_at} onChange={e => setNewChallenge(p => ({ ...p, submissions_close_at: e.target.value }))} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-sky-500" /></div>
              <div><label className="text-xs text-gray-400 block mb-1">Results at</label><input type="datetime-local" value={newChallenge.results_at} onChange={e => setNewChallenge(p => ({ ...p, results_at: e.target.value }))} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-sky-500" /></div>
              <label className="flex items-center gap-2 text-sm text-gray-300"><input type="checkbox" checked={newChallenge.allow_updates} onChange={e => setNewChallenge(p => ({ ...p, allow_updates: e.target.checked }))} /> Allow updates before close</label>
            </div>
            <button onClick={createChallenge} disabled={!newChallenge.title} className="mt-4 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-sm rounded-lg font-medium disabled:opacity-50">Add Challenge</button>
          </div>

          <div className="space-y-3">
            {challenges.map(c => (
              <div key={c.id} className="bg-gray-900 rounded-xl border border-gray-800 p-4 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-white">{c.title}</span>
                  <span className="ml-2 text-xs text-gray-400">{c.submission_type}</span>
                  {c.submissions_close_at && <span className="ml-2 text-xs text-gray-500">closes {new Date(c.submissions_close_at).toLocaleDateString()}</span>}
                </div>
                <button onClick={() => deleteChallenge(c.id)} className="text-red-400 hover:text-red-300 text-sm">Delete</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'submissions' && (
        <div>
          <div className="flex gap-2 mb-4">
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-sky-500">
              <option value="">All statuses</option>
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="space-y-3">
            {filtered.map(s => (
              <div key={s.id} className="bg-gray-900 rounded-xl border border-gray-800 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="font-semibold text-white">{s.title}</span>
                    {s.members && <span className="text-sm text-gray-400 ml-2">by {s.members.display_name}</span>}
                    {s.async_challenges && <span className="text-xs text-gray-500 ml-2">[{s.async_challenges.title}]</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <select value={s.status} onChange={e => updateSubmission(s.id, { status: e.target.value as Submission['status'] })} className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white text-xs focus:outline-none">
                      {STATUSES.map(st => <option key={st} value={st}>{st}</option>)}
                    </select>
                    <input type="number" value={s.score ?? ''} onChange={e => updateSubmission(s.id, { score: e.target.value ? parseFloat(e.target.value) : null })} placeholder="Score" className="w-20 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white text-xs focus:outline-none" />
                  </div>
                </div>
                <textarea value={s.reviewer_notes ?? ''} onChange={e => updateSubmission(s.id, { reviewer_notes: e.target.value })} placeholder="Reviewer notes..." rows={2} className="mt-2 w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white text-xs resize-none focus:outline-none" />
              </div>
            ))}
            {filtered.length === 0 && <p className="text-gray-500 text-sm">No submissions yet.</p>}
          </div>
        </div>
      )}
    </div>
  )
}
