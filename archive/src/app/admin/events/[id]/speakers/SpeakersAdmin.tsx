'use client'

import { useState } from 'react'
import Link from 'next/link'

type Speaker = {
  id: string; name: string; title?: string | null; company?: string | null
  bio?: string | null; photo_url?: string | null; talk_title?: string | null
  talk_description?: string | null; session_type: string; display_order: number
}
type Mentor = {
  id: string; name: string; title?: string | null; company?: string | null
  bio?: string | null; avatar_url?: string | null; expertise_tags: string[]; sort_order: number
}

const SESSION_TYPES = ['keynote', 'talk', 'workshop', 'panel', 'lightning', 'demo']

export default function SpeakersAdmin({
  eventId, eventTitle, initialSpeakers, initialMentors,
}: {
  eventId: string; eventTitle: string; initialSpeakers: Speaker[]; initialMentors: Mentor[]
}) {
  const [tab, setTab] = useState<'speakers' | 'mentors'>('speakers')
  const [speakers, setSpeakers] = useState<Speaker[]>(initialSpeakers)
  const [mentors, setMentors] = useState<Mentor[]>(initialMentors)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [spForm, setSpForm] = useState({ name: '', title: '', company: '', bio: '', photo_url: '', talk_title: '', talk_description: '', session_type: 'talk', display_order: 0 })
  const [mentorForm, setMentorForm] = useState({ name: '', title: '', company: '', bio: '', avatar_url: '', expertise_tags: '', sort_order: 0 })

  async function addSpeaker(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError('')
    const res = await fetch(`/api/admin/events/${eventId}/speakers`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...spForm, avatar_url: spForm.photo_url }),
    })
    if (!res.ok) { setError('Failed to add speaker'); setLoading(false); return }
    const newSp = await res.json()
    setSpeakers(s => [...s, newSp])
    setSpForm({ name: '', title: '', company: '', bio: '', photo_url: '', talk_title: '', talk_description: '', session_type: 'talk', display_order: 0 })
    setLoading(false)
  }

  async function deleteSpeaker(id: string) {
    await fetch(`/api/admin/events/${eventId}/speakers/${id}`, { method: 'DELETE' })
    setSpeakers(s => s.filter(x => x.id !== id))
  }

  async function addMentor(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError('')
    const res = await fetch(`/api/admin/events/${eventId}/mentors`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mentorForm),
    })
    if (!res.ok) { setError('Failed to add mentor'); setLoading(false); return }
    const newM = await res.json()
    setMentors(m => [...m, newM])
    setMentorForm({ name: '', title: '', company: '', bio: '', avatar_url: '', expertise_tags: '', sort_order: 0 })
    setLoading(false)
  }

  async function deleteMentor(id: string) {
    await fetch(`/api/admin/events/${eventId}/mentors/${id}`, { method: 'DELETE' })
    setMentors(m => m.filter(x => x.id !== id))
  }

  return (
    <div className="min-h-screen bg-[#0b0e14] text-[#c9d1e8] p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/admin/events" className="text-xs text-[#38bdf8] hover:underline">Admin</Link>
          <span className="text-[#3a3f52]">/</span>
          <span className="text-sm font-semibold text-white truncate">{eventTitle}</span>
          <span className="text-[#3a3f52]">/</span>
          <span className="text-sm text-[#5a6278]">People</span>
        </div>

        <div className="flex gap-2 mb-6">
          {(['speakers', 'mentors'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${tab === t ? 'bg-[#38bdf8]/20 text-[#38bdf8]' : 'text-[#5a6278] hover:text-[#c9d1e8]'}`}>
              {t} ({t === 'speakers' ? speakers.length : mentors.length})
            </button>
          ))}
        </div>

        {error && <p className="mb-4 text-xs text-red-400">{error}</p>}

        {tab === 'speakers' && (
          <div className="space-y-6">
            <div className="space-y-3">
              {speakers.map(s => (
                <div key={s.id} className="flex items-start gap-3 p-3 rounded-lg bg-[#13161f] border border-[#252b3a]">
                  <div className="w-9 h-9 rounded-full bg-[#1a1f2c] border border-[#252b3a] flex items-center justify-center text-sm font-bold text-[#38bdf8] shrink-0">
                    {s.photo_url ? <img src={s.photo_url} alt={s.name} className="w-9 h-9 rounded-full object-cover" /> : s.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white">{s.name}</p>
                    {(s.title || s.company) && <p className="text-xs text-[#5a6278]">{[s.title, s.company].filter(Boolean).join(' · ')}</p>}
                    {s.talk_title && <p className="text-xs text-[#38bdf8] mt-0.5">{s.talk_title}</p>}
                    <span className="inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded bg-[#252b3a] text-[#5a6278] capitalize">{s.session_type}</span>
                  </div>
                  <button onClick={() => deleteSpeaker(s.id)} className="text-xs text-red-400 hover:text-red-300 shrink-0">Remove</button>
                </div>
              ))}
              {speakers.length === 0 && <p className="text-xs text-[#5a6278]">No speakers yet.</p>}
            </div>

            <form onSubmit={addSpeaker} className="space-y-3 p-4 rounded-xl border border-[#252b3a] bg-[#0d1117]">
              <h3 className="text-sm font-semibold text-white">Add Speaker</h3>
              <div className="grid grid-cols-2 gap-3">
                <input required value={spForm.name} onChange={e => setSpForm(f => ({ ...f, name: e.target.value }))} placeholder="Name *" className="col-span-2 px-3 py-2 rounded-lg bg-[#13161f] border border-[#252b3a] text-sm text-white placeholder-[#5a6278] focus:outline-none focus:border-[#38bdf8]" />
                <input value={spForm.title} onChange={e => setSpForm(f => ({ ...f, title: e.target.value }))} placeholder="Title" className="px-3 py-2 rounded-lg bg-[#13161f] border border-[#252b3a] text-sm text-white placeholder-[#5a6278] focus:outline-none focus:border-[#38bdf8]" />
                <input value={spForm.company} onChange={e => setSpForm(f => ({ ...f, company: e.target.value }))} placeholder="Company" className="px-3 py-2 rounded-lg bg-[#13161f] border border-[#252b3a] text-sm text-white placeholder-[#5a6278] focus:outline-none focus:border-[#38bdf8]" />
                <input value={spForm.talk_title} onChange={e => setSpForm(f => ({ ...f, talk_title: e.target.value }))} placeholder="Talk title" className="px-3 py-2 rounded-lg bg-[#13161f] border border-[#252b3a] text-sm text-white placeholder-[#5a6278] focus:outline-none focus:border-[#38bdf8]" />
                <select value={spForm.session_type} onChange={e => setSpForm(f => ({ ...f, session_type: e.target.value }))} className="px-3 py-2 rounded-lg bg-[#13161f] border border-[#252b3a] text-sm text-white focus:outline-none focus:border-[#38bdf8]">
                  {SESSION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <input value={spForm.photo_url} onChange={e => setSpForm(f => ({ ...f, photo_url: e.target.value }))} placeholder="Avatar URL" className="col-span-2 px-3 py-2 rounded-lg bg-[#13161f] border border-[#252b3a] text-sm text-white placeholder-[#5a6278] focus:outline-none focus:border-[#38bdf8]" />
                <textarea value={spForm.bio} onChange={e => setSpForm(f => ({ ...f, bio: e.target.value }))} placeholder="Bio" rows={2} className="col-span-2 px-3 py-2 rounded-lg bg-[#13161f] border border-[#252b3a] text-sm text-white placeholder-[#5a6278] focus:outline-none focus:border-[#38bdf8] resize-none" />
                <textarea value={spForm.talk_description} onChange={e => setSpForm(f => ({ ...f, talk_description: e.target.value }))} placeholder="Talk description" rows={2} className="col-span-2 px-3 py-2 rounded-lg bg-[#13161f] border border-[#252b3a] text-sm text-white placeholder-[#5a6278] focus:outline-none focus:border-[#38bdf8] resize-none" />
              </div>
              <button type="submit" disabled={loading} className="px-4 py-2 rounded-lg bg-[#38bdf8] text-black text-sm font-semibold hover:bg-[#7aa2f7] transition-colors disabled:opacity-50">
                {loading ? 'Adding...' : 'Add Speaker'}
              </button>
            </form>
          </div>
        )}

        {tab === 'mentors' && (
          <div className="space-y-6">
            <div className="space-y-3">
              {mentors.map(m => (
                <div key={m.id} className="flex items-start gap-3 p-3 rounded-lg bg-[#13161f] border border-[#252b3a]">
                  <div className="w-9 h-9 rounded-full bg-[#1a1f2c] border border-[#252b3a] flex items-center justify-center text-sm font-bold text-[#9ece6a] shrink-0">
                    {m.avatar_url ? <img src={m.avatar_url} alt={m.name} className="w-9 h-9 rounded-full object-cover" /> : m.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white">{m.name}</p>
                    {(m.title || m.company) && <p className="text-xs text-[#5a6278]">{[m.title, m.company].filter(Boolean).join(' · ')}</p>}
                    <div className="flex flex-wrap gap-1 mt-1">
                      {m.expertise_tags.map(t => <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-[#9ece6a]/10 text-[#9ece6a] border border-[#9ece6a]/20">{t}</span>)}
                    </div>
                  </div>
                  <button onClick={() => deleteMentor(m.id)} className="text-xs text-red-400 hover:text-red-300 shrink-0">Remove</button>
                </div>
              ))}
              {mentors.length === 0 && <p className="text-xs text-[#5a6278]">No mentors yet.</p>}
            </div>

            <form onSubmit={addMentor} className="space-y-3 p-4 rounded-xl border border-[#252b3a] bg-[#0d1117]">
              <h3 className="text-sm font-semibold text-white">Add Mentor</h3>
              <div className="grid grid-cols-2 gap-3">
                <input required value={mentorForm.name} onChange={e => setMentorForm(f => ({ ...f, name: e.target.value }))} placeholder="Name *" className="col-span-2 px-3 py-2 rounded-lg bg-[#13161f] border border-[#252b3a] text-sm text-white placeholder-[#5a6278] focus:outline-none focus:border-[#38bdf8]" />
                <input value={mentorForm.title} onChange={e => setMentorForm(f => ({ ...f, title: e.target.value }))} placeholder="Title" className="px-3 py-2 rounded-lg bg-[#13161f] border border-[#252b3a] text-sm text-white placeholder-[#5a6278] focus:outline-none focus:border-[#38bdf8]" />
                <input value={mentorForm.company} onChange={e => setMentorForm(f => ({ ...f, company: e.target.value }))} placeholder="Company" className="px-3 py-2 rounded-lg bg-[#13161f] border border-[#252b3a] text-sm text-white placeholder-[#5a6278] focus:outline-none focus:border-[#38bdf8]" />
                <input value={mentorForm.avatar_url} onChange={e => setMentorForm(f => ({ ...f, avatar_url: e.target.value }))} placeholder="Avatar URL" className="col-span-2 px-3 py-2 rounded-lg bg-[#13161f] border border-[#252b3a] text-sm text-white placeholder-[#5a6278] focus:outline-none focus:border-[#38bdf8]" />
                <input value={mentorForm.expertise_tags} onChange={e => setMentorForm(f => ({ ...f, expertise_tags: e.target.value }))} placeholder="Expertise (comma-separated: AI, Web Dev, UX)" className="col-span-2 px-3 py-2 rounded-lg bg-[#13161f] border border-[#252b3a] text-sm text-white placeholder-[#5a6278] focus:outline-none focus:border-[#38bdf8]" />
                <textarea value={mentorForm.bio} onChange={e => setMentorForm(f => ({ ...f, bio: e.target.value }))} placeholder="Bio" rows={2} className="col-span-2 px-3 py-2 rounded-lg bg-[#13161f] border border-[#252b3a] text-sm text-white placeholder-[#5a6278] focus:outline-none focus:border-[#38bdf8] resize-none" />
              </div>
              <button type="submit" disabled={loading} className="px-4 py-2 rounded-lg bg-[#9ece6a] text-black text-sm font-semibold hover:opacity-90 transition-colors disabled:opacity-50">
                {loading ? 'Adding...' : 'Add Mentor'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
