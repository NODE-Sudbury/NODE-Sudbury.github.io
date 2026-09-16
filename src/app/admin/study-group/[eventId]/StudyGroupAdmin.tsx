'use client';

import { useState } from 'react';

interface CurriculumItem { week: number; title: string; description?: string; resource_url?: string }
interface Cohort {
  id: string;
  name: string;
  topic: string;
  description?: string;
  max_members: number;
  is_open: boolean;
  curriculum: CurriculumItem[];
  study_group_members?: { count: number }[];
}

export default function StudyGroupAdmin({ eventId, initialCohorts }: { eventId: string; initialCohorts: Cohort[] }) {
  const [cohorts, setCohorts] = useState<Cohort[]>(initialCohorts);
  const [tab, setTab] = useState<'cohorts' | 'new'>('cohorts');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', topic: '', description: '', max_members: 20 });
  const [curriculum, setCurriculum] = useState<CurriculumItem[]>([]);
  const [newWeek, setNewWeek] = useState({ title: '', description: '', resource_url: '' });

  async function createCohort() {
    setSaving(true);
    const res = await fetch(`/api/admin/study-group/${eventId}/cohorts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, curriculum }),
    });
    if (res.ok) {
      const data = await res.json();
      setCohorts(prev => [...prev, { ...data, study_group_members: [{ count: 0 }] }]);
      setTab('cohorts');
      setForm({ name: '', topic: '', description: '', max_members: 20 });
      setCurriculum([]);
    }
    setSaving(false);
  }

  function addWeek() {
    if (!newWeek.title) return;
    setCurriculum(prev => [...prev, { week: prev.length + 1, ...newWeek }]);
    setNewWeek({ title: '', description: '', resource_url: '' });
  }

  function moveWeek(idx: number, dir: -1 | 1) {
    const next = [...curriculum];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    setCurriculum(next.map((w, i) => ({ ...w, week: i + 1 })));
  }

  async function toggleOpen(cohort: Cohort) {
    await fetch(`/api/admin/study-group/${eventId}/cohorts/${cohort.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_open: !cohort.is_open }),
    });
    setCohorts(prev => prev.map(c => c.id === cohort.id ? { ...c, is_open: !c.is_open } : c));
  }

  async function deleteCohort(cohortId: string) {
    if (!confirm('Delete this cohort?')) return;
    const res = await fetch(`/api/admin/study-group/${eventId}/cohorts/${cohortId}`, { method: 'DELETE' });
    if (res.ok) setCohorts(prev => prev.filter(c => c.id !== cohortId));
  }

  return (
    <div>
      <div className="flex gap-2 mb-6">
        {(['cohorts', 'new'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize ${tab === t ? 'bg-sky-500 text-black' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}>
            {t === 'new' ? '+ New Cohort' : 'Cohorts'}
          </button>
        ))}
      </div>

      {tab === 'cohorts' && (
        <div className="space-y-4">
          {cohorts.length === 0 && <p className="text-gray-500">No cohorts yet.</p>}
          {cohorts.map(c => (
            <div key={c.id} className="bg-gray-800 rounded-xl p-5 flex items-start justify-between gap-4">
              <div>
                <div className="font-semibold text-white">{c.name}</div>
                <div className="text-sky-400 text-sm">{c.topic}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {c.study_group_members?.[0]?.count ?? 0} / {c.max_members} members
                  {' - '}{c.curriculum?.length ?? 0} weeks
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => toggleOpen(c)}
                  className={`text-xs px-3 py-1.5 rounded-lg border ${c.is_open ? 'border-green-400/40 text-green-400' : 'border-gray-600 text-gray-400'}`}>
                  {c.is_open ? 'Open' : 'Closed'}
                </button>
                <button onClick={() => deleteCohort(c.id)}
                  className="text-xs text-red-400 hover:text-red-300 border border-red-400/30 rounded-lg px-3 py-1.5">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'new' && (
        <div className="space-y-5 max-w-xl">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Cohort Name *</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Topic *</label>
            <input value={form.topic} onChange={e => setForm(f => ({ ...f, topic: e.target.value }))}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Description</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={3} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Max Members</label>
            <input type="number" value={form.max_members} onChange={e => setForm(f => ({ ...f, max_members: Number(e.target.value) }))}
              className="w-32 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" />
          </div>

          <div className="border border-gray-700 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">Curriculum ({curriculum.length} weeks)</h3>
            {curriculum.map((w, i) => (
              <div key={i} className="flex items-center gap-2 mb-2 bg-gray-800 rounded-lg px-3 py-2">
                <span className="text-xs text-gray-500 font-mono w-6">W{w.week}</span>
                <span className="text-sm text-white flex-1">{w.title}</span>
                <button onClick={() => moveWeek(i, -1)} disabled={i === 0} className="text-gray-500 hover:text-gray-300 disabled:opacity-30">▲</button>
                <button onClick={() => moveWeek(i, 1)} disabled={i === curriculum.length - 1} className="text-gray-500 hover:text-gray-300 disabled:opacity-30">▼</button>
                <button onClick={() => setCurriculum(prev => prev.filter((_, j) => j !== i).map((w, j) => ({ ...w, week: j + 1 })))}
                  className="text-red-400 hover:text-red-300 text-xs">×</button>
              </div>
            ))}
            <div className="flex gap-2 mt-3">
              <input placeholder="Week title" value={newWeek.title}
                onChange={e => setNewWeek(w => ({ ...w, title: e.target.value }))}
                className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-white text-sm" />
              <input placeholder="Resource URL" value={newWeek.resource_url}
                onChange={e => setNewWeek(w => ({ ...w, resource_url: e.target.value }))}
                className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-white text-sm" />
              <button onClick={addWeek} className="bg-gray-600 hover:bg-gray-500 text-white text-sm px-3 py-1.5 rounded-lg">+ Add</button>
            </div>
          </div>

          <button onClick={createCohort} disabled={saving || !form.name || !form.topic}
            className="bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-black font-semibold px-6 py-2.5 rounded-lg text-sm">
            {saving ? 'Creating...' : 'Create Cohort'}
          </button>
        </div>
      )}
    </div>
  );
}
