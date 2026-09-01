'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/auth-helpers-nextjs';

const MAX_VOTES = 5;

const SESSION_TYPES = ['talk', 'workshop', 'discussion', 'demo'] as const;

interface Session {
  id: string;
  title: string;
  description: string | null;
  session_type: string;
  status: string;
  dot_votes: number;
  time_slot: string | null;
  room: string | null;
  proposer: { id: string; display_name: string | null } | null;
}

interface Event {
  id: string;
  title: string;
}

interface Props {
  event: Event;
  sessions: Session[];
  memberId: string | null;
  memberVotes: string[];
}

const TYPE_COLORS: Record<string, string> = {
  talk: 'bg-sky-900 text-sky-300',
  workshop: 'bg-purple-900 text-purple-300',
  discussion: 'bg-green-900 text-green-300',
  demo: 'bg-amber-900 text-amber-300',
};

export function UnconferenceBoard({ event, sessions: initialSessions, memberId, memberVotes: initialVotes }: Props) {
  const [sessions, setSessions] = useState<Session[]>(initialSessions);
  const [myVotes, setMyVotes] = useState<Set<string>>(new Set(initialVotes));
  const [tab, setTab] = useState<'vote' | 'schedule'>('vote');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', session_type: 'talk' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    const channel = supabase.channel(`unconference-${event.id}`)
      .on('broadcast', { event: 'vote_update' }, ({ payload }) => {
        setSessions(prev => prev.map(s =>
          s.id === payload.session_id ? { ...s, dot_votes: payload.dot_votes } : s
        ).sort((a, b) => b.dot_votes - a.dot_votes));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [event.id, supabase]);

  const dotsRemaining = MAX_VOTES - myVotes.size;

  const toggleVote = async (sessionId: string) => {
    if (!memberId) { setError('Sign in to vote'); return; }
    const hasVoted = myVotes.has(sessionId);

    if (!hasVoted && dotsRemaining <= 0) { setError(`You've used all ${MAX_VOTES} dot votes`); return; }

    const newVotes = new Set(myVotes);
    hasVoted ? newVotes.delete(sessionId) : newVotes.add(sessionId);
    setMyVotes(newVotes);

    setSessions(prev => prev.map(s =>
      s.id === sessionId ? { ...s, dot_votes: s.dot_votes + (hasVoted ? -1 : 1) } : s
    ).sort((a, b) => b.dot_votes - a.dot_votes));

    const res = await fetch(`/api/unconference/${event.id}/vote`, {
      method: hasVoted ? 'DELETE' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId }),
    });

    if (!res.ok) {
      // Revert
      setMyVotes(new Set(myVotes));
      setSessions(prev => prev.map(s =>
        s.id === sessionId ? { ...s, dot_votes: s.dot_votes + (hasVoted ? 1 : -1) } : s
      ).sort((a, b) => b.dot_votes - a.dot_votes));
      const data = await res.json();
      setError(data.error ?? 'Failed to vote');
    }
  };

  const propose = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    const res = await fetch(`/api/unconference/${event.id}/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setSubmitting(false);
    if (!res.ok) { const d = await res.json(); setError(d.error); return; }
    const newSession = await res.json();
    setSessions(prev => [newSession, ...prev]);
    setShowForm(false);
    setForm({ title: '', description: '', session_type: 'talk' });
  };

  const scheduled = sessions.filter(s => s.status === 'scheduled' && s.time_slot);
  const proposed = sessions.filter(s => s.status === 'proposed');

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold text-white mb-1">{event.title}</h1>
        <p className="text-gray-400 mb-6">Unconference Session Board</p>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 border-b border-gray-800">
          {(['vote', 'schedule'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium capitalize border-b-2 -mb-px transition-colors ${tab === t ? 'border-sky-400 text-sky-400' : 'border-transparent text-gray-400 hover:text-gray-200'}`}>
              {t === 'vote' ? 'Propose & Vote' : 'Schedule'}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-900/40 border border-red-700 rounded-lg text-red-300 text-sm">
            {error} <button onClick={() => setError('')} className="ml-2 underline">dismiss</button>
          </div>
        )}

        {tab === 'vote' && (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-400">
                {memberId ? <span>{dotsRemaining} dot{dotsRemaining !== 1 ? 's' : ''} remaining</span> : <span>Sign in to vote and propose sessions</span>}
              </p>
              {memberId && (
                <button onClick={() => setShowForm(!showForm)}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-sm font-semibold rounded-lg transition-colors">
                  + Propose Session
                </button>
              )}
            </div>

            {showForm && (
              <form onSubmit={propose} className="mb-6 p-5 bg-gray-900 border border-gray-700 rounded-xl space-y-3">
                <h3 className="font-semibold text-white">Propose a Session</h3>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Session title" required
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-sky-500" />
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="What will you cover? (optional)" rows={3}
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-sky-500" />
                <select value={form.session_type} onChange={e => setForm(f => ({ ...f, session_type: e.target.value }))}
                  className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500">
                  {SESSION_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                </select>
                <div className="flex gap-2">
                  <button type="submit" disabled={submitting}
                    className="px-4 py-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-sm font-semibold rounded-lg">
                    {submitting ? 'Submitting...' : 'Submit Proposal'}
                  </button>
                  <button type="button" onClick={() => setShowForm(false)}
                    className="px-4 py-2 text-gray-400 hover:text-gray-200 text-sm">Cancel</button>
                </div>
              </form>
            )}

            {proposed.length === 0 ? (
              <p className="text-gray-500 text-center py-12">No sessions proposed yet. Be the first!</p>
            ) : (
              <div className="space-y-3">
                {proposed.map(s => (
                  <div key={s.id} className="flex gap-4 p-4 bg-gray-900 border border-gray-800 rounded-xl hover:border-gray-700 transition-colors">
                    <button
                      onClick={() => toggleVote(s.id)}
                      aria-label={`${myVotes.has(s.id) ? 'Remove vote from' : 'Vote for'} ${s.title}`}
                      aria-pressed={myVotes.has(s.id)}
                      className={`flex-shrink-0 flex flex-col items-center gap-1 w-12 rounded-lg py-2 transition-colors ${myVotes.has(s.id) ? 'bg-sky-900 text-sky-300' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
                      <span className="text-lg">{myVotes.has(s.id) ? '●' : '○'}</span>
                      <span className="text-xs font-bold">{s.dot_votes}</span>
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2 flex-wrap">
                        <h3 className="font-semibold text-white">{s.title}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[s.session_type] ?? 'bg-gray-700 text-gray-300'}`}>
                          {s.session_type}
                        </span>
                      </div>
                      {s.description && <p className="text-sm text-gray-400 mt-1 line-clamp-2">{s.description}</p>}
                      {s.proposer && <p className="text-xs text-gray-500 mt-1">Proposed by {s.proposer.display_name ?? 'Anonymous'}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {tab === 'schedule' && (
          <div>
            {scheduled.length === 0 ? (
              <p className="text-gray-500 text-center py-12">Schedule not yet published by organizers.</p>
            ) : (
              <div className="space-y-3">
                {scheduled.sort((a, b) => (a.time_slot ?? '').localeCompare(b.time_slot ?? '')).map(s => (
                  <div key={s.id} className="flex gap-4 p-4 bg-gray-900 border border-gray-800 rounded-xl">
                    <div className="flex-shrink-0 w-24 text-center">
                      <p className="text-sky-400 font-mono text-sm font-semibold">{s.time_slot}</p>
                      {s.room && <p className="text-gray-500 text-xs mt-0.5">{s.room}</p>}
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">{s.title}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[s.session_type] ?? 'bg-gray-700 text-gray-300'}`}>
                        {s.session_type}
                      </span>
                      {s.description && <p className="text-sm text-gray-400 mt-1">{s.description}</p>}
                    </div>
                  </div>
                ))}
                {sessions.filter(s => s.status === 'proposed').length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Not Yet Scheduled</h3>
                    {sessions.filter(s => s.status === 'proposed').map(s => (
                      <div key={s.id} className="flex gap-3 p-3 bg-gray-900/50 border border-gray-800 rounded-lg mb-2 opacity-60">
                        <span className="text-gray-500 text-sm">{s.dot_votes} votes</span>
                        <span className="text-gray-300 text-sm">{s.title}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
