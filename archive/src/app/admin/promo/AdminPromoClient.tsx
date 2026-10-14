'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

type Promo = {
  id: string
  code: string
  discount_cents: number | null
  discount_pct: number | null
  max_uses: number | null
  used_count: number
  expires_at: string | null
  is_active: boolean
  created_at: string
  event: { id: string; title: string } | null
}

export function AdminPromoClient({ promos }: { promos: Promo[] }) {
  const [list, setList] = useState(promos)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({
    code: '',
    discount_pct: '',
    discount_cents: '',
    max_uses: '',
    expires_at: '',
  })
  const [saving, setSaving] = useState(false)

  function discountLabel(p: Promo) {
    if (p.discount_pct) return `${p.discount_pct}% off`
    if (p.discount_cents) return `$${(p.discount_cents / 100).toFixed(2)} off`
    return 'Free'
  }

  async function create() {
    setSaving(true)
    const res = await fetch('/api/admin/promo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: form.code.toUpperCase(),
        discount_pct: form.discount_pct ? parseFloat(form.discount_pct) : null,
        discount_cents: form.discount_cents ? Math.round(parseFloat(form.discount_cents) * 100) : null,
        max_uses: form.max_uses ? parseInt(form.max_uses) : null,
        expires_at: form.expires_at || null,
      }),
    })
    if (res.ok) {
      const { promo } = await res.json()
      setList(prev => [promo, ...prev])
      setCreating(false)
      setForm({ code: '', discount_pct: '', discount_cents: '', max_uses: '', expires_at: '' })
    }
    setSaving(false)
  }

  async function toggleActive(id: string, is_active: boolean) {
    await fetch(`/api/admin/promo/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !is_active }),
    })
    setList(prev => prev.map(p => p.id === id ? { ...p, is_active: !is_active } : p))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Promo Codes</h1>
          <p className="text-sm text-muted-foreground mt-1">{list.length} codes</p>
        </div>
        <Button onClick={() => setCreating(c => !c)} variant={creating ? 'outline' : 'default'} size="sm">
          {creating ? 'Cancel' : '+ Create code'}
        </Button>
      </div>

      {creating && (
        <div className="border border-border rounded-lg p-4 space-y-4 bg-muted/20">
          <h2 className="font-medium">New promo code</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Code *</label>
              <input
                type="text"
                value={form.code}
                onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
                className="w-full bg-muted border border-border rounded px-2 py-1.5 text-sm font-mono"
                placeholder="SUMMER25"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">% Discount</label>
              <input
                type="number"
                min={0} max={100} step={1}
                value={form.discount_pct}
                onChange={e => setForm(f => ({ ...f, discount_pct: e.target.value }))}
                className="w-full bg-muted border border-border rounded px-2 py-1.5 text-sm"
                placeholder="e.g. 20"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">$ Discount (dollars)</label>
              <input
                type="number"
                min={0} step={0.01}
                value={form.discount_cents}
                onChange={e => setForm(f => ({ ...f, discount_cents: e.target.value }))}
                className="w-full bg-muted border border-border rounded px-2 py-1.5 text-sm"
                placeholder="e.g. 10.00"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Max uses</label>
              <input
                type="number"
                min={1}
                value={form.max_uses}
                onChange={e => setForm(f => ({ ...f, max_uses: e.target.value }))}
                className="w-full bg-muted border border-border rounded px-2 py-1.5 text-sm"
                placeholder="Leave blank for unlimited"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-muted-foreground mb-1">Expires at</label>
              <input
                type="datetime-local"
                value={form.expires_at}
                onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))}
                className="w-full bg-muted border border-border rounded px-2 py-1.5 text-sm"
              />
            </div>
          </div>
          <Button size="sm" disabled={saving || !form.code} onClick={create}>
            {saving ? 'Saving...' : 'Create'}
          </Button>
        </div>
      )}

      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Code</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Discount</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Event</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Uses</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Expires</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {list.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-12 text-muted-foreground">No promo codes.</td>
              </tr>
            )}
            {list.map(p => (
              <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                <td className="px-4 py-3 font-mono font-medium">{p.code}</td>
                <td className="px-4 py-3">{discountLabel(p)}</td>
                <td className="px-4 py-3 text-muted-foreground">{p.event?.title ?? 'Any'}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {p.used_count} {p.max_uses ? `/ ${p.max_uses}` : ''}
                </td>
                <td className="px-4 py-3 text-muted-foreground text-xs">
                  {p.expires_at ? new Date(p.expires_at).toLocaleDateString() : 'Never'}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded border ${
                    p.is_active
                      ? 'text-green-400 border-green-500/20 bg-green-500/10'
                      : 'text-muted-foreground border-border bg-muted/30'
                  }`}>
                    {p.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => toggleActive(p.id, p.is_active)}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {p.is_active ? 'Disable' : 'Enable'}
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
