'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface EventInfo {
  id: string
  title: string
  starts_at: string | null
  slug: string | null
}

interface SpeakerRecord {
  id: string
  event_id: string
  member_id: string
  name: string | null
  bio: string | null
  photo_url: string | null
  website_url: string | null
  talk_title: string | null
  talk_description: string | null
  slide_deck_url: string | null
  logistics_notes: string | null
  session_type: string | null
  events: EventInfo | null
}

interface Props {
  speaker: SpeakerRecord
}

const inputCls = 'w-full rounded-md border border-[#252b3a] bg-[#0d1117] px-3 py-2 text-sm text-white placeholder:text-[#4a5568] focus:outline-none focus:ring-1 focus:ring-[#38bdf8]'
const labelCls = 'block text-xs font-medium text-[#8892a4] mb-1'

function formatDate(dateStr: string | null) {
  if (!dateStr) return 'Date TBD'
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-CA', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })
}

export default function SpeakerEditClient({ speaker }: Props) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const [bio, setBio] = useState(speaker.bio ?? '')
  const [headshotUrl, setHeadshotUrl] = useState(speaker.photo_url ?? '')
  const [websiteUrl, setWebsiteUrl] = useState(speaker.website_url ?? '')
  const [talkTitle, setTalkTitle] = useState(speaker.talk_title ?? '')
  const [talkAbstract, setTalkAbstract] = useState(speaker.talk_description ?? '')
  const [slideDeckUrl, setSlideDeckUrl] = useState(speaker.slide_deck_url ?? '')
  const [logisticsNotes, setLogisticsNotes] = useState(speaker.logistics_notes ?? '')

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSaved(false)

    try {
      const res = await fetch(`/api/speaker/${speaker.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bio,
          headshot_url: headshotUrl,
          website_url: websiteUrl,
          talk_title: talkTitle,
          talk_abstract: talkAbstract,
          slide_deck_url: slideDeckUrl,
          logistics_notes: logisticsNotes,
        }),
      })
      if (!res.ok) {
        const body = await res.json()
        setError(body.error ?? 'Save failed.')
      } else {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      }
    } catch (err) {
      setError('Network error - please try again.')
    } finally {
      setSaving(false)
    }
  }

  const event = speaker.events

  return (
    <div style={{ minHeight: '100vh', background: '#0b0e14', color: '#e2e8f0' }}>
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '48px 24px' }}>

        {/* Back link */}
        <div style={{ marginBottom: 24 }}>
          <Link
            href="/speaker"
            style={{ color: '#8892a4', fontSize: 14, textDecoration: 'none' }}
          >
            &larr; Back to Speaker Portal
          </Link>
        </div>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: '#e2e8f0', marginBottom: 6 }}>
            Edit Speaker Profile
          </h1>
          {event && (
            <p style={{ color: '#8892a4', fontSize: 14 }}>
              {event.title} &mdash; {formatDate(event.starts_at)}
            </p>
          )}
        </div>

        <form onSubmit={handleSave}>

          {/* About You */}
          <div style={{
            background: '#13161f',
            border: '1px solid #252b3a',
            borderRadius: 12,
            padding: '24px',
            marginBottom: 20,
          }}>
            <h2 style={{ fontSize: 14, fontWeight: 600, color: '#e2e8f0', marginBottom: 20 }}>
              About You
            </h2>

            <div style={{ marginBottom: 16 }}>
              <label className={labelCls}>Bio (max 500 characters)</label>
              <textarea
                className={inputCls}
                rows={5}
                maxLength={500}
                placeholder="Tell attendees about yourself..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                style={{ resize: 'vertical' }}
              />
              <div style={{ textAlign: 'right', fontSize: 11, color: '#4a5568', marginTop: 4 }}>
                {bio.length}/500
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label className={labelCls}>Headshot URL</label>
              <input
                type="url"
                className={inputCls}
                placeholder="https://..."
                value={headshotUrl}
                onChange={(e) => setHeadshotUrl(e.target.value)}
              />
            </div>

            <div>
              <label className={labelCls}>Personal website or LinkedIn URL</label>
              <input
                type="url"
                className={inputCls}
                placeholder="https://linkedin.com/in/yourname"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
              />
            </div>
          </div>

          {/* Session Details */}
          <div style={{
            background: '#13161f',
            border: '1px solid #252b3a',
            borderRadius: 12,
            padding: '24px',
            marginBottom: 20,
          }}>
            <h2 style={{ fontSize: 14, fontWeight: 600, color: '#e2e8f0', marginBottom: 20 }}>
              Session Details
            </h2>

            <div style={{ marginBottom: 16 }}>
              <label className={labelCls}>Talk title</label>
              <input
                type="text"
                className={inputCls}
                placeholder="Your talk title"
                value={talkTitle}
                onChange={(e) => setTalkTitle(e.target.value)}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label className={labelCls}>Talk abstract (max 300 characters)</label>
              <textarea
                className={inputCls}
                rows={4}
                maxLength={300}
                placeholder="Brief description of your talk..."
                value={talkAbstract}
                onChange={(e) => setTalkAbstract(e.target.value)}
                style={{ resize: 'vertical' }}
              />
              <div style={{ textAlign: 'right', fontSize: 11, color: '#4a5568', marginTop: 4 }}>
                {talkAbstract.length}/300
              </div>
            </div>

            <div>
              <label className={labelCls}>Slide deck URL</label>
              <input
                type="url"
                className={inputCls}
                placeholder="https://docs.google.com/... or https://speakerdeck.com/..."
                value={slideDeckUrl}
                onChange={(e) => setSlideDeckUrl(e.target.value)}
              />
            </div>
          </div>

          {/* Logistics */}
          <div style={{
            background: '#13161f',
            border: '1px solid #252b3a',
            borderRadius: 12,
            padding: '24px',
            marginBottom: 28,
          }}>
            <h2 style={{ fontSize: 14, fontWeight: 600, color: '#e2e8f0', marginBottom: 20 }}>
              Travel and Logistics
            </h2>

            <div>
              <label className={labelCls}>Travel needs or notes for organizers</label>
              <textarea
                className={inputCls}
                rows={4}
                placeholder="Any travel requirements, AV needs, accessibility needs, dietary restrictions, etc."
                value={logisticsNotes}
                onChange={(e) => setLogisticsNotes(e.target.value)}
                style={{ resize: 'vertical' }}
              />
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-md bg-[#38bdf8] text-black text-sm font-semibold"
              style={{ opacity: saving ? 0.6 : 1, cursor: saving ? 'not-allowed' : 'pointer', border: 'none' }}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>

            <Link
              href="/speaker"
              className="px-5 py-2 rounded-md border border-[#252b3a] text-sm text-[#8892a4] hover:text-white"
              style={{ textDecoration: 'none' }}
            >
              Cancel
            </Link>

            {saved && (
              <span style={{ color: '#4ade80', fontSize: 14 }}>Saved!</span>
            )}
            {error && (
              <span style={{ color: '#f87171', fontSize: 14 }}>{error}</span>
            )}
          </div>

        </form>
      </div>
    </div>
  )
}
