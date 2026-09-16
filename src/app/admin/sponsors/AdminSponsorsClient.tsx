'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

type Sponsor = {
  id: string
  tier: string
  amount_cents: number | null
  logo_url: string | null
  website_url: string | null
  description: string | null
  is_active: boolean
  created_at: string
  event: { id: string; title: string; slug: string } | null
  member: { id: string; full_name: string; email: string } | null
}

const TIER_COLORS: Record<string, string> = {
  platinum: 'text-cyan-300',
  gold:     'text-yellow-400',
  silver:   'text-gray-300',
  bronze:   'text-orange-400',
}

export function AdminSponsorsClient({ sponsors }: { sponsors: Sponsor[] }) {
  const [list, setList] = useState(sponsors)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ name: '', tier: 'gold', website_url: '', event_id: '' })
  const [saving, setSaving] = useState(false)

  async function toggleActive(id: string, is_active: boolean) {
    await fetch(`/api/admin/sponsors/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !is_active }),
    })
    setList(prev => prev.map(s => s.id === id ? { ...s, is_active: !is_active } : s))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Sponsors</h1>
          <p className="text-sm text-muted-foreground mt-1">{list.length} sponsor records</p>
        </div>
        <Button onClick={() => setCreating(c => !c)} variant={creating ? 'outline' : 'default'} size="sm">
          {creating ? 'Cancel' : '+ Add sponsor'}
        </Button>
      </div>

      {creating && (
        <div className="border border-border rounded-lg p-4 space-y-4 bg-muted/20">
          <h2 className="font-medium">Add sponsor record</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Tier</label>
              <select
                value={form.tier}
                onChange={e => setForm(f => ({ ...f, tier: e.target.value }))}
                className="w-full bg-muted border border-border rounded px-2 py-1.5 text-sm"
              >
                {['platinum','gold','silver','bronze','community'].map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Website URL</label>
              <input
                type="url"
                value={form.website_url}
                onChange={e => setForm(f => ({ ...f, website_url: e.target.value }))}
                className="w-full bg-muted border border-border rounded px-2 py-1.5 text-sm"
                placeholder="https://..."
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Full sponsor management (logo upload, event linking) is done via the Supabase dashboard or the event edit flow.
          </p>
          <Button size="sm" disabled={saving} onClick={async () => {
            setSaving(true)
            const res = await fetch('/api/admin/sponsors', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ tier: form.tier, website_url: form.website_url || null }),
            })
            if (res.ok) {
              const { sponsor } = await res.json()
              setList(prev => [sponsor, ...prev])
              setCreating(false)
            }
            setSaving(false)
          }}>
            {saving ? 'Saving...' : 'Create'}
          </Button>
        </div>
      )}

      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Sponsor</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Tier</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Event</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Contact</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {list.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-12 text-muted-foreground">No sponsors yet.</td>
              </tr>
            )}
            {list.map(s => (
              <tr key={s.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                <td className="px-4 py-3">
                  {s.website_url ? (
                    <a href={s.website_url} target="_blank" rel="noopener noreferrer"
                      className="font-medium hover:underline">
                      {s.website_url.replace(/^https?:\/\//, '')}
                    </a>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={`font-medium capitalize ${TIER_COLORS[s.tier] ?? ''}`}>{s.tier}</span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {s.event?.title ?? 'Global'}
                </td>
                <td className="px-4 py-3 text-muted-foreground text-xs">
                  {s.member?.email ?? '-'}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded border ${
                    s.is_active
                      ? 'text-green-400 border-green-500/20 bg-green-500/10'
                      : 'text-muted-foreground border-border bg-muted/30'
                  }`}>
                    {s.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => toggleActive(s.id, s.is_active)}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {s.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
