'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Series {
  id: string
  name: string
  slug: string
  is_active: boolean
  description: string | null
  episode_count: number
}

function toSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export function SeriesClient({ initialSeries }: { initialSeries: Series[] }) {
  const [list, setList] = useState<Series[]>(initialSeries)
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [description, setDescription] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  function handleNameChange(v: string) {
    setName(v)
    if (!slug || slug === toSlug(name)) setSlug(toSlug(v))
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setCreating(true)
    setError('')
    try {
      const res = await fetch('/api/admin/series', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), slug: slug.trim() || toSlug(name), description: description.trim() || null }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error ?? 'Failed to create'); return }
      setList(prev => [...prev, { ...json.series, episode_count: 0 }])
      setName(''); setSlug(''); setDescription('')
    } catch { setError('Network error') } finally { setCreating(false) }
  }

  async function toggleActive(id: string, current: boolean) {
    const res = await fetch(`/api/admin/series/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !current }),
    })
    if (res.ok) setList(prev => prev.map(s => s.id === id ? { ...s, is_active: !current } : s))
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>New Series</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Name</label>
                <Input value={name} onChange={e => handleNameChange(e.target.value)} placeholder="NORCAT Innovation Series" disabled={creating} />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Slug</label>
                <Input value={slug} onChange={e => setSlug(e.target.value)} placeholder="norcat-innovation-series" disabled={creating} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Description</label>
              <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional description" disabled={creating} />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={creating || !name.trim()}>
              {creating ? 'Creating...' : 'Create series'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>All Series ({list.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Slug</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Episodes</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {list.length === 0 && (
                  <tr><td colSpan={5} className="text-center py-10 text-muted-foreground">No series yet.</td></tr>
                )}
                {list.map(s => (
                  <tr key={s.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-3 font-medium">{s.name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{s.slug}</td>
                    <td className="px-4 py-3">{s.episode_count}</td>
                    <td className="px-4 py-3">
                      {s.is_active
                        ? <Badge variant="secondary">Active</Badge>
                        : <Badge variant="outline" className="text-muted-foreground">Inactive</Badge>
                      }
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => toggleActive(s.id, s.is_active)}
                        className="text-xs text-muted-foreground hover:text-foreground hover:underline"
                      >
                        {s.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
