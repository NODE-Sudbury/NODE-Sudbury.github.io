'use client';

import { useState } from 'react';

const ROOMS = ['Main Hall', 'Room A', 'Room B', 'Room C', 'Hallway Track'];
const TIME_SLOTS = ['9:00-9:45', '10:00-10:45', '11:00-11:45', '13:00-13:45', '14:00-14:45', '15:00-15:45', '16:00-16:45'];

interface Session {
  id: string;
  title: string;
  description: string | null;
  session_type: string;
  status: string;
  dot_votes: number;
  time_slot: string | null;
  room: string | null;
  proposer: { display_name: string | null } | null;
}

interface Props {
  event: { id: string; title: string } | null;
  sessions: Session[];
}

export function UnconferenceAdmin({ event, sessions: initial }: Props) {
  const [sessions, setSessions] = useState<Session[]>(initial);
  const [saving, setSaving] = useState<string | null>(null);

  const schedule = async (sessionId: string, updates: { time_slot?: string; room?: string; status?: string }) => {
    setSaving(sessionId);
    const res = await fetch(`/api/admin/unconference/${event?.id}/sessions/${sessionId}/schedule`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    setSaving(null);
    if (res.ok) {
      const updated = await res.json();
      setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, ...updated } : s));
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-1">{event?.title}</h1>
      <p className="text-gray-400 mb-6">Unconference Session Scheduler</p>

      <div className="space-y-3">
        {sessions.map(s => (
          <div key={s.id} className={`p-4 rounded-xl border ${s.status === 'scheduled' ? 'border-green-800 bg-green-950/30' : s.status === 'cancelled' ? 'border-gray-800 bg-gray-900 opacity-50' : 'border-gray-700 bg-gray-900'}`}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-white">{s.title}</span>
                  <span className="text-xs bg-sky-900 text-sky-300 px-2 py-0.5 rounded-full">{s.dot_votes} votes</span>
                  <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">{s.session_type}</span>
                </div>
                {s.proposer && <p className="text-xs text-gray-500 mt-0.5">by {s.proposer.display_name ?? 'Unknown'}</p>}
                {s.description && <p className="text-sm text-gray-400 mt-1 line-clamp-2">{s.description}</p>}
              </div>
              <div className="flex-shrink-0 flex gap-2 items-center flex-wrap">
                <select
                  value={s.time_slot ?? ''}
                  onChange={e => schedule(s.id, { time_slot: e.target.value || undefined })}
                  className="bg-gray-800 border border-gray-600 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:border-sky-500">
                  <option value="">Time slot</option>
                  {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <select
                  value={s.room ?? ''}
                  onChange={e => schedule(s.id, { room: e.target.value || undefined })}
                  className="bg-gray-800 border border-gray-600 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:border-sky-500">
                  <option value="">Room</option>
                  {ROOMS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                {s.status === 'proposed' ? (
                  <button
                    disabled={!s.time_slot || !s.room || saving === s.id}
                    onClick={() => schedule(s.id, { status: 'scheduled' })}
                    className="px-3 py-1.5 bg-green-700 hover:bg-green-600 disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-colors">
                    {saving === s.id ? '...' : 'Schedule'}
                  </button>
                ) : s.status === 'scheduled' ? (
                  <button
                    onClick={() => schedule(s.id, { status: 'proposed' })}
                    className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg">
                    Unschedule
                  </button>
                ) : null}
                {s.status !== 'cancelled' && (
                  <button
                    onClick={() => schedule(s.id, { status: 'cancelled' })}
                    className="px-3 py-1.5 bg-red-900 hover:bg-red-800 text-red-300 text-sm rounded-lg">
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
        {sessions.length === 0 && (
          <p className="text-gray-500 text-center py-12">No sessions proposed yet.</p>
        )}
      </div>
    </div>
  );
}
