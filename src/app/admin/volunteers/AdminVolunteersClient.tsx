'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

type Application = {
  id: string
  status: string
  motivation: string | null
  hours_available: number | null
  skills: string[] | null
  created_at: string
  member: { id: string; full_name: string; email: string; avatar_url: string | null } | null
  event: { id: string; title: string; slug: string; starts_at: string } | null
}

const STATUS_COLORS: Record<string, string> = {
  pending:  'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  approved: 'bg-green-500/10 text-green-400 border-green-500/20',
  rejected: 'bg-red-500/10 text-red-400 border-red-500/20',
  withdrawn:'bg-muted text-muted-foreground',
}

export function AdminVolunteersClient({ applications }: { applications: Application[] }) {
  const [list, setList]   = useState(applications)
  const [filter, setFilter] = useState<string>('all')
  const [loading, setLoading] = useState<string | null>(null)

  const filtered = filter === 'all' ? list : list.filter(a => a.status === filter)

  async function updateStatus(id: string, status: string) {
    setLoading(id)
    const res = await fetch(`/api/admin/volunteers/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (res.ok) {
      setList(prev => prev.map(a => a.id === id ? { ...a, status } : a))
    }
    setLoading(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Volunteer Applications</h1>
          <p className="text-sm text-muted-foreground mt-1">{list.length} total applications</p>
        </div>
        <div className="flex gap-2">
          {['all','pending','approved','rejected'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-md text-sm capitalize transition-colors ${
                filter === f ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Applicant</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Event</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Hours/wk</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Applied</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-12 text-muted-foreground">No applications found.</td>
              </tr>
            )}
            {filtered.map(app => (
              <tr key={app.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                <td className="px-4 py-3">
                  <p className="font-medium">{app.member?.full_name ?? 'Unknown'}</p>
                  <p className="text-xs text-muted-foreground">{app.member?.email}</p>
                </td>
                <td className="px-4 py-3">
                  {app.event ? (
                    <>
                      <p className="font-medium truncate max-w-[180px]">{app.event.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(app.event.starts_at).toLocaleDateString()}
                      </p>
                    </>
                  ) : (
                    <span className="text-muted-foreground">Any event</span>
                  )}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{app.hours_available ?? '-'}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs border font-medium ${STATUS_COLORS[app.status] ?? ''}`}>
                    {app.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground text-xs">
                  {new Date(app.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  {app.status === 'pending' && (
                    <div className="flex gap-2 justify-end">
                      <Button size="sm" variant="outline"
                        disabled={loading === app.id}
                        onClick={() => updateStatus(app.id, 'approved')}
                        className="text-green-400 border-green-500/30 hover:bg-green-500/10"
                      >
                        Approve
                      </Button>
                      <Button size="sm" variant="outline"
                        disabled={loading === app.id}
                        onClick={() => updateStatus(app.id, 'rejected')}
                        className="text-red-400 border-red-500/30 hover:bg-red-500/10"
                      >
                        Reject
                      </Button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
