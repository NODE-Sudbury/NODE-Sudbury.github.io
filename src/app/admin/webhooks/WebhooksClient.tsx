'use client'

import { useState } from 'react'

interface Webhook {
  id: string
  webhook_url: string
  event_id: string | null
  chapter_id: string
  is_active: boolean
  created_at: string
  events?: { title: string; slug: string } | null
}

interface Event {
  id: string
  title: string
  slug: string
}

interface Props {
  initialWebhooks: Webhook[]
  events: Event[]
}

function maskUrl(url: string) {
  return url.slice(0, 20) + '...'
}

export function WebhooksClient({ initialWebhooks, events }: Props) {
  const [webhooks, setWebhooks] = useState<Webhook[]>(initialWebhooks)
  const [form, setForm] = useState({ webhook_url: '', event_id: '', is_active: true })
  const [adding, setAdding] = useState(false)
  const [formError, setFormError] = useState('')
  const [testStatus, setTestStatus] = useState<Record<string, 'idle' | 'loading' | 'ok' | 'error'>>({})
  const [testMessage, setTestMessage] = useState<Record<string, string>>({})

  async function reload() {
    const res = await fetch('/api/admin/webhooks')
    if (res.ok) {
      const json = await res.json()
      setWebhooks(json.webhooks ?? [])
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')
    if (!form.webhook_url.trim()) {
      setFormError('Webhook URL is required.')
      return
    }
    setAdding(true)
    try {
      const res = await fetch('/api/admin/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webhook_url: form.webhook_url.trim(),
          event_id: form.event_id || null,
          is_active: form.is_active,
        }),
      })
      if (!res.ok) {
        const json = await res.json()
        setFormError(json.error ?? 'Failed to add webhook.')
      } else {
        setForm({ webhook_url: '', event_id: '', is_active: true })
        await reload()
      }
    } finally {
      setAdding(false)
    }
  }

  async function toggleActive(wh: Webhook) {
    const res = await fetch(`/api/admin/webhooks/${wh.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !wh.is_active }),
    })
    if (res.ok) await reload()
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this webhook?')) return
    const res = await fetch(`/api/admin/webhooks/${id}`, { method: 'DELETE' })
    if (res.ok) await reload()
  }

  async function handleTest(wh: Webhook) {
    setTestStatus((s) => ({ ...s, [wh.id]: 'loading' }))
    setTestMessage((m) => ({ ...m, [wh.id]: '' }))
    try {
      const res = await fetch(`/api/admin/webhooks/${wh.id}/test`, { method: 'POST' })
      const json = await res.json()
      if (res.ok && json.ok) {
        setTestStatus((s) => ({ ...s, [wh.id]: 'ok' }))
        setTestMessage((m) => ({ ...m, [wh.id]: 'Test sent.' }))
      } else {
        setTestStatus((s) => ({ ...s, [wh.id]: 'error' }))
        setTestMessage((m) => ({ ...m, [wh.id]: json.error ?? 'Test failed.' }))
      }
    } catch {
      setTestStatus((s) => ({ ...s, [wh.id]: 'error' }))
      setTestMessage((m) => ({ ...m, [wh.id]: 'Network error.' }))
    }
    setTimeout(() => {
      setTestStatus((s) => ({ ...s, [wh.id]: 'idle' }))
      setTestMessage((m) => ({ ...m, [wh.id]: '' }))
    }, 4000)
  }

  return (
    <div style={{ color: '#e2e8f0' }}>
      {/* Add form */}
      <div
        style={{
          background: '#13161f',
          border: '1px solid #252b3a',
          borderRadius: 8,
          padding: '20px 24px',
          marginBottom: 28,
        }}
      >
        <h2 style={{ fontSize: 15, fontWeight: 600, color: '#e2e8f0', marginBottom: 14 }}>
          Add Webhook
        </h2>
        <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: '#8892a4', marginBottom: 4 }}>
              Discord Webhook URL
            </label>
            <input
              type="url"
              placeholder="https://discord.com/api/webhooks/..."
              value={form.webhook_url}
              onChange={(e) => setForm((f) => ({ ...f, webhook_url: e.target.value }))}
              required
              style={{
                width: '100%',
                background: '#0d1117',
                border: '1px solid #252b3a',
                borderRadius: 6,
                padding: '8px 12px',
                color: '#e2e8f0',
                fontSize: 13,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, color: '#8892a4', marginBottom: 4 }}>
              Associate with Event (optional)
            </label>
            <select
              value={form.event_id}
              onChange={(e) => setForm((f) => ({ ...f, event_id: e.target.value }))}
              style={{
                width: '100%',
                background: '#0d1117',
                border: '1px solid #252b3a',
                borderRadius: 6,
                padding: '8px 12px',
                color: '#e2e8f0',
                fontSize: 13,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            >
              <option value="">All events (global)</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.title}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              id="is_active_add"
              checked={form.is_active}
              onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
              style={{ accentColor: '#38bdf8' }}
            />
            <label htmlFor="is_active_add" style={{ fontSize: 13, color: '#e2e8f0' }}>
              Active
            </label>
          </div>

          {formError && (
            <p style={{ fontSize: 12, color: '#f87171' }}>{formError}</p>
          )}

          <div>
            <button
              type="submit"
              disabled={adding}
              style={{
                background: '#38bdf8',
                color: '#0d1117',
                border: 'none',
                borderRadius: 6,
                padding: '8px 18px',
                fontSize: 13,
                fontWeight: 600,
                cursor: adding ? 'not-allowed' : 'pointer',
                opacity: adding ? 0.6 : 1,
              }}
            >
              {adding ? 'Adding...' : 'Add Webhook'}
            </button>
          </div>
        </form>
      </div>

      {/* Webhook list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {webhooks.length === 0 && (
          <p style={{ color: '#8892a4', fontSize: 13 }}>No webhooks configured yet.</p>
        )}
        {webhooks.map((wh) => {
          const status = testStatus[wh.id] ?? 'idle'
          const msg = testMessage[wh.id] ?? ''
          return (
            <div
              key={wh.id}
              style={{
                background: '#13161f',
                border: '1px solid #252b3a',
                borderRadius: 8,
                padding: '14px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                flexWrap: 'wrap',
              }}
            >
              {/* URL + event */}
              <div style={{ flex: 1, minWidth: 200 }}>
                <p
                  style={{
                    fontSize: 13,
                    fontFamily: 'monospace',
                    color: '#e2e8f0',
                    marginBottom: 2,
                  }}
                >
                  {maskUrl(wh.webhook_url)}
                </p>
                <p style={{ fontSize: 11, color: '#8892a4' }}>
                  {wh.events ? `Event: ${wh.events.title}` : 'Global - all events'}
                </p>
              </div>

              {/* Active toggle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button
                  onClick={() => toggleActive(wh)}
                  title={wh.is_active ? 'Deactivate' : 'Activate'}
                  style={{
                    width: 38,
                    height: 20,
                    borderRadius: 10,
                    border: 'none',
                    background: wh.is_active ? '#38bdf8' : '#252b3a',
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'background 0.2s',
                    padding: 0,
                  }}
                >
                  <span
                    style={{
                      display: 'block',
                      width: 14,
                      height: 14,
                      borderRadius: '50%',
                      background: '#e2e8f0',
                      position: 'absolute',
                      top: 3,
                      left: wh.is_active ? 21 : 3,
                      transition: 'left 0.2s',
                    }}
                  />
                </button>
                <span style={{ fontSize: 11, color: wh.is_active ? '#38bdf8' : '#8892a4' }}>
                  {wh.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>

              {/* Test button */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  onClick={() => handleTest(wh)}
                  disabled={status === 'loading'}
                  style={{
                    background: 'transparent',
                    border: '1px solid #252b3a',
                    borderRadius: 6,
                    padding: '5px 12px',
                    fontSize: 12,
                    color: '#e2e8f0',
                    cursor: status === 'loading' ? 'not-allowed' : 'pointer',
                    opacity: status === 'loading' ? 0.6 : 1,
                  }}
                >
                  {status === 'loading' ? 'Sending...' : 'Test'}
                </button>
                {msg && (
                  <span
                    style={{
                      fontSize: 11,
                      color: status === 'ok' ? '#4ade80' : '#f87171',
                    }}
                  >
                    {msg}
                  </span>
                )}
              </div>

              {/* Delete button */}
              <button
                onClick={() => handleDelete(wh.id)}
                style={{
                  background: 'transparent',
                  border: '1px solid #3a2020',
                  borderRadius: 6,
                  padding: '5px 12px',
                  fontSize: 12,
                  color: '#f87171',
                  cursor: 'pointer',
                }}
              >
                Delete
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
