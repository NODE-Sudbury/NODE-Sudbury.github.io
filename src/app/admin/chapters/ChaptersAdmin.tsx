'use client'

import { useState } from 'react'

type Chapter = {
  id: string; name: string; city: string | null; province: string | null
  slug: string | null; description: string | null; website_url: string | null
  logo_url: string | null; twitter_handle: string | null; instagram_handle: string | null
  is_active: boolean
}

export default function ChaptersAdmin({ chapters: initial }: { chapters: Chapter[] }) {
  const [chapters, setChapters] = useState(initial)
  const [editing, setEditing] = useState<string | null>(null)
  const [form, setForm] = useState<Partial<Chapter>>({})
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  function startEdit(chapter: Chapter) {
    setEditing(chapter.id)
    setForm({ ...chapter })
    setMsg('')
  }

  async function save(id: string) {
    setSaving(true)
    setMsg('')
    const res = await fetch(`/api/admin/chapters/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { setMsg(data.error ?? 'Error'); return }
    setChapters(cs => cs.map(c => c.id === id ? data : c))
    setEditing(null)
    setMsg('Saved.')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Chapters</h2>
        {msg && <span className="text-sm text-green-400">{msg}</span>}
      </div>

      {chapters.map(chapter => (
        <div key={chapter.id} className="bg-[#13161e] border border-[#252b3a] rounded-xl p-6">
          {editing === chapter.id ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {([
                  ['name', 'Name'], ['slug', 'Slug'], ['city', 'City'], ['province', 'Province'],
                  ['website_url', 'Website URL'], ['logo_url', 'Logo URL'],
                  ['twitter_handle', 'Twitter Handle'], ['instagram_handle', 'Instagram Handle'],
                ] as [keyof Chapter, string][]).map(([key, label]) => (
                  <div key={key}>
                    <label className="text-xs text-[#5a6278] block mb-1">{label}</label>
                    <input
                      className="w-full bg-[#0b0e14] border border-[#252b3a] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-[#f0e6d3]/50"
                      value={(form[key] as string) ?? ''}
                      onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    />
                  </div>
                ))}
              </div>
              <div>
                <label className="text-xs text-[#5a6278] block mb-1">Description</label>
                <textarea
                  rows={3}
                  className="w-full bg-[#0b0e14] border border-[#252b3a] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-[#f0e6d3]/50 resize-none"
                  value={(form.description as string) ?? ''}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={!!form.is_active}
                  onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                  className="accent-sky-400" />
                <span className="text-sm text-[#c9d1e8]">Active</span>
              </label>
              <div className="flex gap-2">
                <button onClick={() => save(chapter.id)} disabled={saving}
                  className="px-4 py-1.5 bg-[#f0e6d3] text-[#0b0e14] text-sm font-semibold rounded hover:bg-white transition-colors disabled:opacity-50">
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button onClick={() => setEditing(null)}
                  className="px-4 py-1.5 text-sm text-[#5a6278] hover:text-[#c9d1e8] transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-semibold text-white">{chapter.name}</h3>
                <p className="text-xs text-[#5a6278] mt-0.5">
                  {chapter.city}, {chapter.province}
                  {chapter.slug && <span className="ml-2 text-sky-400">/chapters/{chapter.slug}</span>}
                </p>
                {chapter.description && <p className="text-sm text-[#7a8398] mt-2 max-w-xl">{chapter.description}</p>}
                <div className="flex gap-3 mt-2 text-xs text-[#5a6278]">
                  {chapter.website_url && <span>{chapter.website_url}</span>}
                  {chapter.twitter_handle && <span>@{chapter.twitter_handle}</span>}
                </div>
                <span className={`mt-2 inline-block text-xs px-2 py-0.5 rounded-full ${chapter.is_active ? 'bg-green-500/15 text-green-400' : 'bg-gray-500/15 text-gray-400'}`}>
                  {chapter.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <button onClick={() => startEdit(chapter)}
                className="text-xs text-[#5a6278] hover:text-[#c9d1e8] px-3 py-1 border border-[#252b3a] rounded transition-colors">
                Edit
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
