'use client'

import { useState } from 'react'

type Tier = {
  id: string
  name: string
  price_cents: number
  capacity: number | null
  description: string | null
  is_active: boolean
  sort_order: number
}

type Props = {
  eventId: string
  eventTitle: string
  initialTiers: Tier[]
}

function formatPrice(cents: number) {
  if (cents === 0) return 'Free'
  return `$${(cents / 100).toFixed(2)} CAD`
}

export default function TiersClient({ eventId, eventTitle, initialTiers }: Props) {
  const [tiers, setTiers] = useState<Tier[]>(initialTiers)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState<string | null>(null)

  // Add-tier form state
  const [addName, setAddName] = useState('')
  const [addPrice, setAddPrice] = useState('')
  const [addCapacity, setAddCapacity] = useState('')
  const [addDesc, setAddDesc] = useState('')
  const [addOrder, setAddOrder] = useState('')
  const [adding, setAdding] = useState(false)

  // Edit state: tierId -> patch object
  const [editing, setEditing] = useState<Record<string, Partial<Tier>>>({})

  const baseUrl = `/api/admin/events/${eventId}/tiers`

  async function reload() {
    const res = await fetch(baseUrl)
    const json = await res.json()
    setTiers(json.tiers ?? [])
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setAdding(true)
    setError(null)
    try {
      const priceDollars = parseFloat(addPrice)
      if (isNaN(priceDollars) || priceDollars < 0) {
        setError('Enter a valid price (0 for free).')
        return
      }
      const res = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: addName.trim(),
          price_cents: Math.round(priceDollars * 100),
          capacity: addCapacity ? parseInt(addCapacity, 10) : null,
          description: addDesc.trim() || null,
          sort_order: addOrder ? parseInt(addOrder, 10) : 0,
        }),
      })
      if (!res.ok) {
        const j = await res.json()
        setError(j.error ?? 'Failed to add tier.')
        return
      }
      setAddName('')
      setAddPrice('')
      setAddCapacity('')
      setAddDesc('')
      setAddOrder('')
      await reload()
    } finally {
      setAdding(false)
    }
  }

  async function saveEdit(tier: Tier) {
    const patch = editing[tier.id]
    if (!patch || Object.keys(patch).length === 0) return
    setSaving(tier.id)
    setError(null)
    try {
      const res = await fetch(`${baseUrl}/${tier.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      if (!res.ok) {
        const j = await res.json()
        setError(j.error ?? 'Save failed.')
        return
      }
      setEditing(prev => {
        const next = { ...prev }
        delete next[tier.id]
        return next
      })
      await reload()
    } finally {
      setSaving(null)
    }
  }

  async function toggleActive(tier: Tier) {
    setSaving(tier.id)
    setError(null)
    try {
      const res = await fetch(`${baseUrl}/${tier.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !tier.is_active }),
      })
      if (!res.ok) {
        const j = await res.json()
        setError(j.error ?? 'Toggle failed.')
        return
      }
      await reload()
    } finally {
      setSaving(null)
    }
  }

  async function handleDelete(tier: Tier) {
    if (!confirm(`Delete tier "${tier.name}"?`)) return
    setSaving(tier.id)
    setError(null)
    try {
      const res = await fetch(`${baseUrl}/${tier.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const j = await res.json()
        setError(j.error ?? 'Delete failed.')
        return
      }
      await reload()
    } finally {
      setSaving(null)
    }
  }

  function patchField(tierId: string, key: keyof Tier, value: unknown) {
    setEditing(prev => ({
      ...prev,
      [tierId]: { ...(prev[tierId] ?? {}), [key]: value },
    }))
  }

  function currentValue<K extends keyof Tier>(tier: Tier, key: K): Tier[K] {
    return (editing[tier.id]?.[key] as Tier[K]) ?? tier[key]
  }

  return (
    <div className="min-h-screen bg-[#0d1117] text-[#e2e8f0]">
      <div className="max-w-4xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="mb-8">
          <a
            href={`/admin/events/${eventId}`}
            className="text-xs text-[#8892a4] hover:text-[#38bdf8] transition-colors mb-4 inline-block"
          >
            Back to event
          </a>
          <h1 className="text-xl font-bold text-white">Ticket Tiers</h1>
          <p className="text-sm text-[#8892a4] mt-1">{eventTitle}</p>
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Add tier form */}
        <section className="mb-8 p-5 rounded-xl border border-[#252b3a] bg-[#13161f]">
          <h2 className="text-sm font-semibold text-white mb-4">Add a Tier</h2>
          <form onSubmit={handleAdd} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-[#8892a4] mb-1">Name *</label>
                <input
                  required
                  value={addName}
                  onChange={e => setAddName(e.target.value)}
                  placeholder="e.g. Early Bird"
                  className="w-full px-3 py-2 rounded-lg bg-[#0d1117] border border-[#252b3a] text-sm text-[#e2e8f0] placeholder-[#3a3f52] focus:outline-none focus:border-[#38bdf8]"
                />
              </div>
              <div>
                <label className="block text-xs text-[#8892a4] mb-1">Price (dollars, 0 = Free) *</label>
                <input
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  value={addPrice}
                  onChange={e => setAddPrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 rounded-lg bg-[#0d1117] border border-[#252b3a] text-sm text-[#e2e8f0] placeholder-[#3a3f52] focus:outline-none focus:border-[#38bdf8]"
                />
              </div>
              <div>
                <label className="block text-xs text-[#8892a4] mb-1">Capacity (optional)</label>
                <input
                  type="number"
                  min="1"
                  value={addCapacity}
                  onChange={e => setAddCapacity(e.target.value)}
                  placeholder="Unlimited"
                  className="w-full px-3 py-2 rounded-lg bg-[#0d1117] border border-[#252b3a] text-sm text-[#e2e8f0] placeholder-[#3a3f52] focus:outline-none focus:border-[#38bdf8]"
                />
              </div>
              <div>
                <label className="block text-xs text-[#8892a4] mb-1">Sort order</label>
                <input
                  type="number"
                  min="0"
                  value={addOrder}
                  onChange={e => setAddOrder(e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2 rounded-lg bg-[#0d1117] border border-[#252b3a] text-sm text-[#e2e8f0] placeholder-[#3a3f52] focus:outline-none focus:border-[#38bdf8]"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-[#8892a4] mb-1">Description (optional)</label>
              <textarea
                rows={2}
                value={addDesc}
                onChange={e => setAddDesc(e.target.value)}
                placeholder="Short description shown to attendees"
                className="w-full px-3 py-2 rounded-lg bg-[#0d1117] border border-[#252b3a] text-sm text-[#e2e8f0] placeholder-[#3a3f52] focus:outline-none focus:border-[#38bdf8] resize-none"
              />
            </div>
            <button
              type="submit"
              disabled={adding}
              className="px-5 py-2 rounded-lg bg-[#38bdf8] text-[#0d1117] text-sm font-semibold hover:bg-[#7dd3fc] transition-colors disabled:opacity-50"
            >
              {adding ? 'Adding...' : 'Add Tier'}
            </button>
          </form>
        </section>

        {/* Tiers table */}
        {tiers.length === 0 ? (
          <p className="text-sm text-[#8892a4]">No tiers yet. Add one above.</p>
        ) : (
          <div className="space-y-3">
            {tiers.map(tier => {
              const isEdited = !!(editing[tier.id] && Object.keys(editing[tier.id]).length > 0)
              const isSaving = saving === tier.id
              const displayName = currentValue(tier, 'name') as string
              const displayPrice = currentValue(tier, 'price_cents') as number
              const displayCap = currentValue(tier, 'capacity') as number | null
              const displayDesc = currentValue(tier, 'description') as string | null
              const displayOrder = currentValue(tier, 'sort_order') as number
              const displayActive = currentValue(tier, 'is_active') as boolean

              return (
                <div
                  key={tier.id}
                  className={`rounded-xl border bg-[#13161f] p-5 transition-colors ${
                    displayActive ? 'border-[#252b3a]' : 'border-[#252b3a] opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      {displayPrice === 0 ? (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#9ece6a]/15 text-[#9ece6a] border border-[#9ece6a]/30">
                          Free
                        </span>
                      ) : (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#38bdf8]/10 text-[#38bdf8] border border-[#38bdf8]/20">
                          {formatPrice(displayPrice)}
                        </span>
                      )}
                      {!displayActive && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#8892a4]/10 text-[#8892a4] border border-[#8892a4]/20">
                          Inactive
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleActive(tier)}
                        disabled={isSaving}
                        className="text-xs px-3 py-1.5 rounded-lg border border-[#252b3a] text-[#8892a4] hover:text-[#e2e8f0] hover:border-[#38bdf8] transition-colors disabled:opacity-50"
                      >
                        {displayActive ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        onClick={() => handleDelete(tier)}
                        disabled={isSaving}
                        className="text-xs px-3 py-1.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-[#8892a4] mb-1">Name</label>
                      <input
                        value={displayName}
                        onChange={e => patchField(tier.id, 'name', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-[#0d1117] border border-[#252b3a] text-sm text-[#e2e8f0] focus:outline-none focus:border-[#38bdf8]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[#8892a4] mb-1">Price (dollars)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={(displayPrice / 100).toFixed(2)}
                        onChange={e => patchField(tier.id, 'price_cents', Math.round(parseFloat(e.target.value || '0') * 100))}
                        className="w-full px-3 py-2 rounded-lg bg-[#0d1117] border border-[#252b3a] text-sm text-[#e2e8f0] focus:outline-none focus:border-[#38bdf8]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[#8892a4] mb-1">Capacity</label>
                      <input
                        type="number"
                        min="1"
                        value={displayCap ?? ''}
                        onChange={e => patchField(tier.id, 'capacity', e.target.value ? parseInt(e.target.value, 10) : null)}
                        placeholder="Unlimited"
                        className="w-full px-3 py-2 rounded-lg bg-[#0d1117] border border-[#252b3a] text-sm text-[#e2e8f0] placeholder-[#3a3f52] focus:outline-none focus:border-[#38bdf8]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[#8892a4] mb-1">Sort order</label>
                      <input
                        type="number"
                        min="0"
                        value={displayOrder}
                        onChange={e => patchField(tier.id, 'sort_order', parseInt(e.target.value || '0', 10))}
                        className="w-full px-3 py-2 rounded-lg bg-[#0d1117] border border-[#252b3a] text-sm text-[#e2e8f0] focus:outline-none focus:border-[#38bdf8]"
                      />
                    </div>
                  </div>
                  <div className="mt-3">
                    <label className="block text-xs text-[#8892a4] mb-1">Description</label>
                    <textarea
                      rows={2}
                      value={displayDesc ?? ''}
                      onChange={e => patchField(tier.id, 'description', e.target.value || null)}
                      placeholder="Optional short description"
                      className="w-full px-3 py-2 rounded-lg bg-[#0d1117] border border-[#252b3a] text-sm text-[#e2e8f0] placeholder-[#3a3f52] focus:outline-none focus:border-[#38bdf8] resize-none"
                    />
                  </div>
                  {isEdited && (
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => saveEdit(tier)}
                        disabled={isSaving}
                        className="text-xs px-4 py-2 rounded-lg bg-[#38bdf8] text-[#0d1117] font-semibold hover:bg-[#7dd3fc] transition-colors disabled:opacity-50"
                      >
                        {isSaving ? 'Saving...' : 'Save changes'}
                      </button>
                      <button
                        onClick={() => setEditing(prev => {
                          const next = { ...prev }
                          delete next[tier.id]
                          return next
                        })}
                        disabled={isSaving}
                        className="text-xs px-4 py-2 rounded-lg border border-[#252b3a] text-[#8892a4] hover:text-[#e2e8f0] transition-colors disabled:opacity-50"
                      >
                        Discard
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
