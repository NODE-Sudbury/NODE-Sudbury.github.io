'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

type Flag = {
  id: string
  reason: string
  status: string
  content_type: string
  content_id: string
  created_at: string
  reporter: { id: string; full_name: string; email: string } | null
}

type Ban = {
  id: string
  reason: string
  banned_until: string | null
  is_permanent: boolean
  created_at: string
  member: { id: string; full_name: string; email: string } | null
}

export function AdminModerationClient({ flags, bans }: { flags: Flag[]; bans: Ban[] }) {
  const [tab, setTab] = useState<'flags' | 'bans'>('flags')
  const [flagList, setFlagList] = useState(flags)
  const [loading, setLoading] = useState<string | null>(null)

  async function resolveFlag(id: string, status: 'resolved' | 'dismissed') {
    setLoading(id)
    await fetch(`/api/admin/moderation/flags/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    setFlagList(prev => prev.map(f => f.id === id ? { ...f, status } : f))
    setLoading(null)
  }

  const openFlags = flagList.filter(f => f.status === 'open')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Moderation</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {openFlags.length} open flags - {bans.length} active bans
        </p>
      </div>

      <div className="flex gap-1 border-b border-border">
        {(['flags', 'bans'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors capitalize ${
              tab === t ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t === 'flags' ? `Flags (${openFlags.length} open)` : `Bans (${bans.length})`}
          </button>
        ))}
      </div>

      {tab === 'flags' && (
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Type</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Reason</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Reporter</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {flagList.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-muted-foreground">No flags.</td>
                </tr>
              )}
              {flagList.map(f => (
                <tr key={f.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-3">
                    <span className="text-xs bg-muted px-2 py-0.5 rounded">{f.content_type}</span>
                  </td>
                  <td className="px-4 py-3 max-w-[200px] truncate">{f.reason}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{f.reporter?.email ?? '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded border ${
                      f.status === 'open'
                        ? 'text-yellow-400 border-yellow-500/20 bg-yellow-500/10'
                        : f.status === 'resolved'
                        ? 'text-green-400 border-green-500/20 bg-green-500/10'
                        : 'text-muted-foreground border-border'
                    }`}>{f.status}</span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {new Date(f.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    {f.status === 'open' && (
                      <div className="flex gap-2 justify-end">
                        <button
                          disabled={loading === f.id}
                          onClick={() => resolveFlag(f.id, 'resolved')}
                          className="text-xs text-green-400 hover:underline disabled:opacity-50"
                        >
                          Resolve
                        </button>
                        <button
                          disabled={loading === f.id}
                          onClick={() => resolveFlag(f.id, 'dismissed')}
                          className="text-xs text-muted-foreground hover:text-foreground hover:underline disabled:opacity-50"
                        >
                          Dismiss
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'bans' && (
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Member</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Reason</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Type</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Until</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Issued</th>
              </tr>
            </thead>
            <tbody>
              {bans.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-muted-foreground">No active bans.</td>
                </tr>
              )}
              {bans.map(b => (
                <tr key={b.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-3">
                    <p className="font-medium">{b.member?.full_name ?? 'Unknown'}</p>
                    <p className="text-xs text-muted-foreground">{b.member?.email}</p>
                  </td>
                  <td className="px-4 py-3 max-w-[180px] truncate text-muted-foreground">{b.reason}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded border ${
                      b.is_permanent
                        ? 'text-red-400 border-red-500/20 bg-red-500/10'
                        : 'text-yellow-400 border-yellow-500/20 bg-yellow-500/10'
                    }`}>
                      {b.is_permanent ? 'Permanent' : 'Temporary'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {b.banned_until ? new Date(b.banned_until).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {new Date(b.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
