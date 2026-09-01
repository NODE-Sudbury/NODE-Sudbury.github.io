'use client'

import { useState } from 'react'

interface Event {
  id: string
  title: string
  starts_at: string
  type: string
  status: string
}

interface Props {
  events: Event[]
}

const inputCls =
  'w-full rounded-md border border-[#252b3a] bg-[#0d1117] px-3 py-2 text-sm text-white placeholder:text-[#4a5568] focus:outline-none focus:ring-1 focus:ring-[#38bdf8]'

const labelCls = 'block text-xs font-medium text-[#8892a4] mb-1'

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('en-CA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return iso
  }
}

function renderMarkdownPreview(md: string): string {
  // Very lightweight markdown-to-HTML for preview only
  let html = md
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  // Bold + italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" style="color:#38bdf8">$1</a>')

  // Headings
  html = html.replace(/^### (.+)$/gm, '<h3 style="font-size:1rem;font-weight:600;margin:12px 0 4px">$1</h3>')
  html = html.replace(/^## (.+)$/gm, '<h2 style="font-size:1.1rem;font-weight:600;margin:14px 0 4px">$1</h2>')
  html = html.replace(/^# (.+)$/gm, '<h1 style="font-size:1.2rem;font-weight:700;margin:16px 0 4px">$1</h1>')

  // Paragraphs (double newlines)
  html = html.replace(/\n\n+/g, '</p><p style="margin:8px 0">')
  html = '<p style="margin:8px 0">' + html + '</p>'

  // Single newlines
  html = html.replace(/\n/g, '<br/>')

  return html
}

type SendState = 'idle' | 'confirming' | 'sending' | 'done' | 'error'

export function EmailsClient({ events }: Props) {
  const [recipientType, setRecipientType] = useState<'all' | 'event'>('all')
  const [eventId, setEventId] = useState('')
  const [regCount, setRegCount] = useState<number | null>(null)
  const [regLoading, setRegLoading] = useState(false)
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [preview, setPreview] = useState(false)
  const [sendState, setSendState] = useState<SendState>('idle')
  const [result, setResult] = useState<{ sent: number; failed: number } | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [testSent, setTestSent] = useState(false)
  const [testLoading, setTestLoading] = useState(false)

  async function handleEventChange(id: string) {
    setEventId(id)
    setRegCount(null)
    if (!id) return
    setRegLoading(true)
    try {
      const res = await fetch(`/api/admin/emails/count?event_id=${encodeURIComponent(id)}`)
      const data = await res.json()
      setRegCount(data.count ?? null)
    } catch {
      setRegCount(null)
    } finally {
      setRegLoading(false)
    }
  }

  async function sendTest() {
    setTestLoading(true)
    setTestSent(false)
    try {
      const res = await fetch('/api/admin/emails/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject,
          body,
          test: true,
          ...(recipientType === 'event' && eventId ? { event_id: eventId } : {}),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Send failed')
      setTestSent(true)
    } catch (e: any) {
      setErrorMsg(e.message || 'Test send failed')
    } finally {
      setTestLoading(false)
    }
  }

  async function confirmSend() {
    setSendState('sending')
    setErrorMsg('')
    try {
      const res = await fetch('/api/admin/emails/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject,
          body,
          ...(recipientType === 'event' && eventId ? { event_id: eventId } : {}),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Send failed')
      setResult({ sent: data.sent ?? 0, failed: data.failed ?? 0 })
      setSendState('done')
    } catch (e: any) {
      setErrorMsg(e.message || 'Failed to send emails')
      setSendState('error')
    }
  }

  const canSubmit = subject.trim().length > 0 && body.trim().length >= 20
  const selectedEvent = events.find((e) => e.id === eventId)

  return (
    <div className="space-y-6" style={{ color: '#e2e8f0' }}>
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold" style={{ color: '#e2e8f0' }}>
          Broadcast Email
        </h1>
        <p className="text-sm mt-1" style={{ color: '#8892a4' }}>
          Send an announcement to event registrants or all active members.
        </p>
      </div>

      <div
        style={{
          background: '#13161f',
          border: '1px solid #252b3a',
          borderRadius: '0.5rem',
          padding: '1.5rem',
        }}
        className="space-y-5"
      >
        {/* Recipient */}
        <div>
          <label className={labelCls}>Recipients</label>
          <div className="flex gap-3 mb-3">
            <button
              type="button"
              onClick={() => { setRecipientType('all'); setEventId(''); setRegCount(null) }}
              style={{
                padding: '6px 14px',
                borderRadius: '0.375rem',
                fontSize: '0.8125rem',
                fontWeight: 500,
                border: '1px solid',
                borderColor: recipientType === 'all' ? '#38bdf8' : '#252b3a',
                color: recipientType === 'all' ? '#38bdf8' : '#8892a4',
                background: 'transparent',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              All members
            </button>
            <button
              type="button"
              onClick={() => setRecipientType('event')}
              style={{
                padding: '6px 14px',
                borderRadius: '0.375rem',
                fontSize: '0.8125rem',
                fontWeight: 500,
                border: '1px solid',
                borderColor: recipientType === 'event' ? '#38bdf8' : '#252b3a',
                color: recipientType === 'event' ? '#38bdf8' : '#8892a4',
                background: 'transparent',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              Specific event
            </button>
          </div>

          {recipientType === 'event' && (
            <div>
              <select
                className={inputCls}
                value={eventId}
                onChange={(e) => handleEventChange(e.target.value)}
                style={{ background: '#0d1117', color: '#e2e8f0' }}
              >
                <option value="">Select an event...</option>
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.title} - {fmtDate(ev.starts_at)} [{ev.status}]
                  </option>
                ))}
              </select>
              {regLoading && (
                <p className="text-xs mt-1" style={{ color: '#8892a4' }}>
                  Loading registrant count...
                </p>
              )}
              {!regLoading && regCount !== null && (
                <p className="text-xs mt-1" style={{ color: '#38bdf8' }}>
                  {regCount} confirmed registrant{regCount !== 1 ? 's' : ''} for this event
                </p>
              )}
            </div>
          )}
        </div>

        {/* Subject */}
        <div>
          <label className={labelCls} htmlFor="email-subject">
            Subject <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <input
            id="email-subject"
            className={inputCls}
            type="text"
            placeholder="e.g. NODE July Meetup - See you Thursday!"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
        </div>

        {/* Body */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className={labelCls} htmlFor="email-body" style={{ marginBottom: 0 }}>
              Message body <span style={{ color: '#ef4444' }}>*</span>
              <span style={{ color: '#4a5568', fontWeight: 400, marginLeft: 6 }}>
                (markdown supported)
              </span>
            </label>
            <button
              type="button"
              onClick={() => setPreview((p) => !p)}
              style={{
                fontSize: '0.75rem',
                color: '#38bdf8',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              {preview ? 'Edit' : 'Preview'}
            </button>
          </div>

          {preview ? (
            <div
              style={{
                minHeight: 160,
                border: '1px solid #252b3a',
                borderRadius: '0.375rem',
                padding: '12px',
                fontSize: '0.875rem',
                color: '#e2e8f0',
                lineHeight: 1.6,
              }}
              dangerouslySetInnerHTML={{ __html: renderMarkdownPreview(body) }}
            />
          ) : (
            <textarea
              id="email-body"
              className={inputCls}
              rows={8}
              placeholder="Write your message here. Markdown is supported: **bold**, *italic*, [links](https://...), ## headings."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              style={{ resize: 'vertical', fontFamily: 'inherit' }}
            />
          )}
          {body.trim().length > 0 && body.trim().length < 20 && (
            <p className="text-xs mt-1" style={{ color: '#ef4444' }}>
              Body must be at least 20 characters.
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-3 items-center pt-1">
          {/* Test send */}
          <button
            type="button"
            disabled={!canSubmit || testLoading}
            onClick={sendTest}
            style={{
              padding: '8px 20px',
              borderRadius: '0.375rem',
              border: '1px solid #252b3a',
              fontSize: '0.875rem',
              color: !canSubmit || testLoading ? '#4a5568' : '#8892a4',
              background: 'transparent',
              cursor: !canSubmit || testLoading ? 'not-allowed' : 'pointer',
              transition: 'color 0.15s',
            }}
            title="Sends one email to your own address"
          >
            {testLoading ? 'Sending...' : 'Send test to myself'}
          </button>

          {/* Send to all */}
          <button
            type="button"
            disabled={!canSubmit || sendState === 'sending' || sendState === 'done'}
            onClick={() => {
              if (sendState === 'idle' || sendState === 'error') setSendState('confirming')
            }}
            style={{
              padding: '8px 20px',
              borderRadius: '0.375rem',
              border: 'none',
              fontSize: '0.875rem',
              fontWeight: 600,
              background:
                !canSubmit || sendState === 'sending' || sendState === 'done'
                  ? '#1a2e1a'
                  : '#16a34a',
              color:
                !canSubmit || sendState === 'sending' || sendState === 'done'
                  ? '#4a5568'
                  : '#fff',
              cursor:
                !canSubmit || sendState === 'sending' || sendState === 'done'
                  ? 'not-allowed'
                  : 'pointer',
              transition: 'background 0.15s',
            }}
          >
            {sendState === 'sending' ? 'Sending...' : 'Send to all recipients'}
          </button>

          {testSent && (
            <span style={{ fontSize: '0.8125rem', color: '#22c55e' }}>
              Test email sent.
            </span>
          )}
        </div>
      </div>

      {/* Confirm dialog */}
      {sendState === 'confirming' && (
        <div
          style={{
            background: '#13161f',
            border: '1px solid #252b3a',
            borderRadius: '0.5rem',
            padding: '1.25rem 1.5rem',
          }}
        >
          <p className="text-sm font-medium mb-1" style={{ color: '#e2e8f0' }}>
            Confirm broadcast
          </p>
          <p className="text-sm mb-4" style={{ color: '#8892a4' }}>
            {recipientType === 'event' && selectedEvent
              ? `You are about to send to ${regCount !== null ? regCount : 'all confirmed'} registrant${regCount !== 1 ? 's' : ''} of "${selectedEvent.title}". This cannot be undone.`
              : 'You are about to send to all active members. This cannot be undone.'}
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setSendState('idle')}
              style={{
                padding: '7px 18px',
                borderRadius: '0.375rem',
                border: '1px solid #252b3a',
                fontSize: '0.875rem',
                color: '#8892a4',
                background: 'transparent',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmSend}
              style={{
                padding: '7px 18px',
                borderRadius: '0.375rem',
                border: 'none',
                fontSize: '0.875rem',
                fontWeight: 600,
                background: '#16a34a',
                color: '#fff',
                cursor: 'pointer',
              }}
            >
              Confirm and send
            </button>
          </div>
        </div>
      )}

      {/* Sending spinner */}
      {sendState === 'sending' && (
        <div
          style={{
            background: '#13161f',
            border: '1px solid #252b3a',
            borderRadius: '0.5rem',
            padding: '1.25rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <Spinner />
          <span className="text-sm" style={{ color: '#8892a4' }}>
            Sending emails, please wait...
          </span>
        </div>
      )}

      {/* Success */}
      {sendState === 'done' && result && (
        <div
          style={{
            background: '#0d1f12',
            border: '1px solid #166534',
            borderRadius: '0.5rem',
            padding: '1.25rem 1.5rem',
          }}
        >
          <p className="text-sm font-semibold mb-1" style={{ color: '#22c55e' }}>
            Emails sent successfully
          </p>
          <p className="text-sm" style={{ color: '#8892a4' }}>
            {result.sent} email{result.sent !== 1 ? 's' : ''} delivered
            {result.failed > 0 ? `, ${result.failed} failed` : ''}.
          </p>
          <button
            type="button"
            onClick={() => {
              setSendState('idle')
              setResult(null)
              setSubject('')
              setBody('')
              setEventId('')
              setRegCount(null)
              setRecipientType('all')
              setTestSent(false)
            }}
            style={{
              marginTop: 12,
              padding: '6px 14px',
              borderRadius: '0.375rem',
              border: '1px solid #252b3a',
              fontSize: '0.8125rem',
              color: '#8892a4',
              background: 'transparent',
              cursor: 'pointer',
            }}
          >
            Send another
          </button>
        </div>
      )}

      {/* Error */}
      {sendState === 'error' && errorMsg && (
        <div
          style={{
            background: '#1f0d0d',
            border: '1px solid #7f1d1d',
            borderRadius: '0.5rem',
            padding: '1.25rem 1.5rem',
          }}
        >
          <p className="text-sm font-semibold mb-1" style={{ color: '#ef4444' }}>
            Failed to send
          </p>
          <p className="text-sm" style={{ color: '#8892a4' }}>
            {errorMsg}
          </p>
          <button
            type="button"
            onClick={() => { setSendState('idle'); setErrorMsg('') }}
            style={{
              marginTop: 12,
              padding: '6px 14px',
              borderRadius: '0.375rem',
              border: '1px solid #252b3a',
              fontSize: '0.8125rem',
              color: '#8892a4',
              background: 'transparent',
              cursor: 'pointer',
            }}
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  )
}

function Spinner() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#38bdf8"
      strokeWidth="2.5"
      strokeLinecap="round"
      style={{ animation: 'spin 0.75s linear infinite', flexShrink: 0 }}
    >
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
      <path d="M12 2a10 10 0 0 1 10 10" />
    </svg>
  )
}
