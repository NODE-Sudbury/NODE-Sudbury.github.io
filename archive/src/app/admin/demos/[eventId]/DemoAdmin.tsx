'use client';

import { useState } from 'react';

interface Slot {
  id: string;
  title: string;
  tagline?: string;
  category?: string;
  status: string;
  slot_order: number;
  vote_count: number;
  members?: { display_name?: string } | null;
}

export function DemoAdmin({ eventId, initialSlots }: { eventId: string; initialSlots: Slot[] }) {
  const [slots, setSlots] = useState(initialSlots);
  const [loading, setLoading] = useState<string | null>(null);

  async function updateSlot(slotId: string, patch: Record<string, unknown>) {
    setLoading(slotId);
    const res = await fetch(`/api/admin/demos/${eventId}/slots/${slotId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    if (res.ok) {
      const updated = await res.json();
      setSlots(prev => prev.map(s => s.id === slotId ? { ...s, ...updated } : s));
    }
    setLoading(null);
  }

  function moveOrder(slotId: string, dir: -1 | 1) {
    const idx = slots.findIndex(s => s.id === slotId);
    if (idx < 0) return;
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= slots.length) return;
    const newSlots = [...slots];
    [newSlots[idx], newSlots[newIdx]] = [newSlots[newIdx], newSlots[idx]];
    const updated = newSlots.map((s, i) => ({ ...s, slot_order: i }));
    setSlots(updated);
    updateSlot(slotId, { slot_order: newIdx });
    updateSlot(newSlots[idx].id, { slot_order: idx });
  }

  const byStatus = (s: string) => slots.filter(sl => sl.status === s);

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <h1 className="text-2xl font-bold mb-6">Demo Day Admin</h1>

      {(['pending', 'confirmed', 'cancelled'] as const).map(status => (
        <div key={status} className="mb-8">
          <h2 className="text-lg font-semibold mb-3 capitalize text-gray-300">{status} ({byStatus(status).length})</h2>
          {byStatus(status).length === 0 && <p className="text-gray-600 text-sm">None</p>}
          <div className="flex flex-col gap-3">
            {byStatus(status).map((slot, i) => (
              <div key={slot.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center gap-4">
                <div className="flex flex-col gap-1">
                  <button onClick={() => moveOrder(slot.id, -1)} disabled={i === 0} className="text-gray-500 hover:text-white disabled:opacity-30 text-xs">▲</button>
                  <span className="text-xs text-gray-600 text-center">{slot.slot_order + 1}</span>
                  <button onClick={() => moveOrder(slot.id, 1)} disabled={i === byStatus(status).length - 1} className="text-gray-500 hover:text-white disabled:opacity-30 text-xs">▼</button>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold">{slot.title}</p>
                  {slot.tagline && <p className="text-sky-400 text-sm">{slot.tagline}</p>}
                  <p className="text-gray-500 text-xs">by {slot.members?.display_name ?? 'Unknown'} · {slot.category} · {slot.vote_count} votes</p>
                </div>
                <div className="flex gap-2">
                  {status !== 'confirmed' && (
                    <button onClick={() => updateSlot(slot.id, { status: 'confirmed' })}
                      disabled={loading === slot.id}
                      className="px-3 py-1.5 bg-green-800 hover:bg-green-700 text-green-200 text-xs rounded-lg font-semibold transition-colors">
                      Confirm
                    </button>
                  )}
                  {status !== 'cancelled' && (
                    <button onClick={() => updateSlot(slot.id, { status: 'cancelled' })}
                      disabled={loading === slot.id}
                      className="px-3 py-1.5 bg-red-900 hover:bg-red-800 text-red-300 text-xs rounded-lg font-semibold transition-colors">
                      Cancel
                    </button>
                  )}
                  {status !== 'pending' && (
                    <button onClick={() => updateSlot(slot.id, { status: 'pending' })}
                      disabled={loading === slot.id}
                      className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs rounded-lg transition-colors">
                      Reset
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
