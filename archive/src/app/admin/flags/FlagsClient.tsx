'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'

type Flag = {
  key: string
  description: string
  enabled: boolean
  updated_at: string
}

function Switch({ checked, onCheckedChange, disabled }: {
  checked: boolean
  onCheckedChange: (val: boolean) => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={[
        'relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-50',
        checked ? 'bg-primary' : 'bg-input',
      ].join(' ')}
    >
      <span
        className={[
          'pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform',
          checked ? 'translate-x-4' : 'translate-x-0',
        ].join(' ')}
      />
    </button>
  )
}

export function FlagsClient({ flags }: { flags: Flag[] }) {
  const [list, setList] = useState<Flag[]>(flags)
  const [toggling, setToggling] = useState<Set<string>>(new Set())
  const [errors, setErrors] = useState<Record<string, string>>({})

  async function handleToggle(flag: Flag) {
    if (toggling.has(flag.key)) return

    setToggling(prev => new Set(prev).add(flag.key))
    setErrors(prev => { const n = { ...prev }; delete n[flag.key]; return n })

    try {
      const res = await fetch(`/api/admin/flags/${flag.key}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !flag.enabled }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `HTTP ${res.status}`)
      }

      setList(prev =>
        prev.map(f =>
          f.key === flag.key
            ? { ...f, enabled: !f.enabled, updated_at: new Date().toISOString() }
            : f
        )
      )
    } catch (err) {
      setErrors(prev => ({
        ...prev,
        [flag.key]: err instanceof Error ? err.message : 'Failed to save',
      }))
    } finally {
      setToggling(prev => {
        const n = new Set(prev)
        n.delete(flag.key)
        return n
      })
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Feature Flags</h1>
        <p className="text-sm text-muted-foreground mt-1">{list.length} flags</p>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Flag</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Description</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Last updated</th>
              </tr>
            </thead>
            <tbody>
              {list.map((flag, idx) => (
                <tr
                  key={flag.key}
                  className={[
                    'border-b border-border last:border-0',
                    idx % 2 === 0 ? '' : 'bg-muted/20',
                  ].join(' ')}
                >
                  <td className="px-4 py-3 font-mono text-xs font-medium">{flag.key}</td>
                  <td className="px-4 py-3 text-muted-foreground max-w-xs">
                    {flag.description}
                    {errors[flag.key] && (
                      <p className="text-destructive text-xs mt-1">{errors[flag.key]}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={flag.enabled}
                        onCheckedChange={() => handleToggle(flag)}
                        disabled={toggling.has(flag.key)}
                      />
                      <Badge variant={flag.enabled ? 'default' : 'secondary'}>
                        {toggling.has(flag.key) ? 'Saving...' : flag.enabled ? 'On' : 'Off'}
                      </Badge>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {new Date(flag.updated_at).toLocaleString()}
                  </td>
                </tr>
              ))}
              {list.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                    No feature flags found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
