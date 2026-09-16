'use client'

import { useState } from 'react'

type LogEntry = {
  id: string
  action: string
  entity_type: string
  entity_id: string | null
  payload: Record<string, unknown> | null
  created_at: string
  actor: { id: string; full_name: string; email: string } | null
}

const ACTION_COLORS: Record<string, string> = {
  create: 'text-green-400',
  update: 'text-blue-400',
  delete: 'text-red-400',
  approve:'text-green-400',
  reject: 'text-red-400',
  ban:    'text-red-400',
  unban:  'text-yellow-400',
}

export function AdminAuditClient({ logs }: { logs: LogEntry[] }) {
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)

  const filtered = logs.filter(l => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      l.action.toLowerCase().includes(q) ||
      l.entity_type.toLowerCase().includes(q) ||
      l.actor?.email.toLowerCase().includes(q) ||
      l.actor?.full_name.toLowerCase().includes(q)
    )
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Audit Log</h1>
          <p className="text-sm text-muted-foreground mt-1">Last 200 admin actions</p>
        </div>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search actions, entities, actors..."
          className="bg-muted border border-border rounded px-3 py-1.5 text-sm w-64 focus:outline-none focus:ring-1 focus:ring-foreground/30"
        />
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Time</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Actor</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Action</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Entity</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center py-12 text-muted-foreground">No logs found.</td>
              </tr>
            )}
            {filtered.map(log => (
              <>
                <tr
                  key={log.id}
                  className="border-b border-border last:border-0 hover:bg-muted/20 cursor-pointer"
                  onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                >
                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{log.actor?.full_name ?? 'System'}</p>
                    <p className="text-xs text-muted-foreground">{log.actor?.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`font-mono font-medium text-xs ${ACTION_COLORS[log.action] ?? 'text-foreground'}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    <span className="bg-muted px-1.5 py-0.5 rounded">{log.entity_type}</span>
                    {log.entity_id && (
                      <span className="ml-2 font-mono">{log.entity_id.slice(0, 8)}...</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                    {log.payload ? (expanded === log.id ? '' : '') : ''}
                  </td>
                </tr>
                {expanded === log.id && log.payload && (
                  <tr key={`${log.id}-expand`} className="border-b border-border bg-muted/10">
                    <td colSpan={5} className="px-4 py-3">
                      <pre className="text-xs text-muted-foreground overflow-x-auto">
                        {JSON.stringify(log.payload, null, 2)}
                      </pre>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
