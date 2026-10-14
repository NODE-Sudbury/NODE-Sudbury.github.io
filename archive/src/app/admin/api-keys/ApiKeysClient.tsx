'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export type ApiKey = {
  id: string
  label: string
  prefix: string
  created_at: string
  last_used_at: string | null
  revoked_at: string | null
}

export function ApiKeysClient({ keys }: { keys: ApiKey[] }) {
  const [list, setList] = useState<ApiKey[]>(keys)
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newKey, setNewKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    setError(null)
    setNewKey(null)
    try {
      const res = await fetch('/api/admin/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? 'Failed to create key')
        return
      }
      setList(prev => [json.key, ...prev])
      setNewKey(json.rawKey)
      setName('')
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  async function handleRevoke(id: string) {
    try {
      const res = await fetch('/api/admin/api-keys', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      if (res.ok) {
        setList(prev => prev.filter(k => k.id !== id))
      }
    } catch {
      // silently ignore - UI will stay consistent on next refresh
    }
  }

  async function copyKey() {
    if (!newKey) return
    await navigator.clipboard.writeText(newKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function fmt(iso: string | null) {
    if (!iso) return '-'
    return new Date(iso).toLocaleDateString('en-CA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create API Key</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="block text-xs text-muted-foreground mb-1">Key name</label>
              <Input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. CI pipeline"
                disabled={loading}
              />
            </div>
            <Button type="submit" disabled={loading || !name.trim()}>
              {loading ? 'Creating...' : 'Create key'}
            </Button>
          </form>
          {error && (
            <p className="mt-2 text-sm text-destructive">{error}</p>
          )}
        </CardContent>
      </Card>

      {newKey && (
        <div className="rounded-lg border border-yellow-500/40 bg-yellow-500/10 p-4 space-y-2">
          <p className="text-sm font-medium text-yellow-400">
            Copy this key now - it will not be shown again.
          </p>
          <div className="flex items-center gap-3">
            <code className="flex-1 text-xs font-mono bg-black/30 rounded px-3 py-2 break-all select-all">
              {newKey}
            </code>
            <Button size="sm" variant="outline" onClick={copyKey}>
              {copied ? 'Copied!' : 'Copy'}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setNewKey(null)}>
              Dismiss
            </Button>
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>API Keys ({list.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Prefix</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Created</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Last used</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {list.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-muted-foreground">
                      No API keys yet.
                    </td>
                  </tr>
                )}
                {list.map(k => (
                  <tr key={k.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-3 font-medium">{k.label}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {k.prefix}...
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{fmt(k.created_at)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{fmt(k.last_used_at)}</td>
                    <td className="px-4 py-3">
                      {k.revoked_at ? (
                        <Badge variant="destructive">Revoked</Badge>
                      ) : (
                        <Badge variant="secondary">Active</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {!k.revoked_at && (
                        <button
                          onClick={() => handleRevoke(k.id)}
                          className="text-xs text-destructive hover:underline"
                        >
                          Revoke
                        </button>
                      )}
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
