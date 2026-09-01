'use client'

import { useState } from 'react'

const inputCls =
  'w-full rounded-md border border-[#252b3a] bg-[#0d1117] px-3 py-2 text-sm text-white placeholder:text-[#4a5568] focus:outline-none focus:ring-1 focus:ring-[#38bdf8]'
const labelCls = 'block text-xs font-medium text-[#8892a4] mb-1'

interface EventLocation {
  name: string | null
  address: string | null
}

interface EventData {
  id: string
  title: string
  slug: string | null
  starts_at: string | null
  ends_at: string | null
  status: string | null
  event_locations: EventLocation | EventLocation[] | null
}

interface MemberData {
  id: string
  full_name: string | null
  email: string | null
}

interface SponsorData {
  id: string
  tier: string | null
  amount_cents: number | null
  logo_url: string | null
  website_url: string | null
  description: string | null
  booth_description: string | null
  booth_assignment: string | null
  contact_name: string | null
  contact_email: string | null
  is_active: boolean | null
  event: EventData | null
  member: MemberData | null
}

interface Props {
  sponsor: SponsorData
  token: string
  registrationCount: number
}

function formatDate(d: string | null) {
  if (!d) return 'TBD'
  return new Date(d).toLocaleDateString('en-CA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
}

function tierBadge(tier: string | null) {
  const t = (tier ?? 'general').toLowerCase()
  const map: Record<string, { bg: string; border: string; color: string; label: string }> = {
    platinum: { bg: '#1a1a2e', border: '#94a3b8', color: '#cbd5e1', label: 'Platinum' },
    gold: { bg: '#1c1500', border: '#f59e0b', color: '#f59e0b', label: 'Gold' },
    silver: { bg: '#0f1520', border: '#64748b', color: '#94a3b8', label: 'Silver' },
    bronze: { bg: '#1a0e08', border: '#b45309', color: '#d97706', label: 'Bronze' },
  }
  const style = map[t] ?? { bg: '#0f111a', border: '#252b3a', color: '#8892a4', label: tier ?? 'General' }
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      background: style.bg,
      border: `1px solid ${style.border}`,
      color: style.color,
      borderRadius: 12,
      padding: '3px 10px',
      fontSize: 12,
      fontWeight: 600,
      letterSpacing: '0.04em',
      textTransform: 'uppercase',
    }}>
      {style.label}
    </span>
  )
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: '#1a1f2c', border: '1px solid #252b3a', borderRadius: 10, padding: '24px', ...style }}>
      {children}
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{ fontSize: 13, fontWeight: 600, color: '#8892a4', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>
      {children}
    </h2>
  )
}

export default function SponsorPortalClient({ sponsor, token, registrationCount }: Props) {
  const event = sponsor.event
  const loc = Array.isArray(event?.event_locations) ? event.event_locations[0] : event?.event_locations

  const [form, setForm] = useState({
    description: sponsor.description ?? '',
    website_url: sponsor.website_url ?? '',
    booth_description: sponsor.booth_description ?? '',
    contact_name: sponsor.contact_name ?? '',
    contact_email: sponsor.contact_email ?? '',
    logo_url: sponsor.logo_url ?? '',
  })

  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [saveError, setSaveError] = useState('')

  function handleChange(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (saveStatus === 'saved' || saveStatus === 'error') setSaveStatus('idle')
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaveStatus('saving')
    setSaveError('')

    try {
      const res = await fetch(`/api/sponsor/${token}/update`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        setSaveError(data.error ?? 'Save failed.')
        setSaveStatus('error')
        return
      }
      setSaveStatus('saved')
    } catch {
      setSaveError('Network error. Please try again.')
      setSaveStatus('error')
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0f111a', color: '#e2e8f0', fontFamily: 'system-ui, sans-serif' }}>
      {/* Nav */}
      <nav style={{ borderBottom: '1px solid #1e2433', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 17, fontWeight: 700, color: '#e2e8f0', letterSpacing: '-0.02em' }}>NODE</span>
          <span style={{ color: '#252b3a' }}>/</span>
          <span style={{ fontSize: 13, color: '#8892a4' }}>Sponsor Portal</span>
        </div>
        {tierBadge(sponsor.tier)}
      </nav>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 24px 64px' }}>

        {/* Welcome */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 6 }}>
            Welcome back{sponsor.contact_name ? `, ${sponsor.contact_name.split(' ')[0]}` : ''}
          </h1>
          <p style={{ color: '#8892a4', fontSize: 14 }}>
            Manage your sponsorship details for the event below.
          </p>
        </div>

        {/* Event info card */}
        {event && (
          <Card style={{ marginBottom: 20 }}>
            <SectionTitle>Event</SectionTitle>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16 }}>
              <div>
                <div style={{ fontSize: 11, color: '#8892a4', marginBottom: 3 }}>EVENT NAME</div>
                <div style={{ fontSize: 15, fontWeight: 600 }}>{event.title}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#8892a4', marginBottom: 3 }}>DATE</div>
                <div style={{ fontSize: 14 }}>{formatDate(event.starts_at)}</div>
              </div>
              {loc?.name && (
                <div>
                  <div style={{ fontSize: 11, color: '#8892a4', marginBottom: 3 }}>VENUE</div>
                  <div style={{ fontSize: 14 }}>{loc.name}</div>
                  {loc.address && <div style={{ fontSize: 12, color: '#8892a4' }}>{loc.address}</div>}
                </div>
              )}
              {sponsor.booth_assignment && (
                <div>
                  <div style={{ fontSize: 11, color: '#8892a4', marginBottom: 3 }}>BOOTH</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#38bdf8' }}>{sponsor.booth_assignment}</div>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Metrics */}
        <Card style={{ marginBottom: 20 }}>
          <SectionTitle>Attendee metrics</SectionTitle>
          <div style={{ display: 'flex', gap: 32 }}>
            <div>
              <div style={{ fontSize: 32, fontWeight: 800, color: '#38bdf8', lineHeight: 1 }}>{registrationCount}</div>
              <div style={{ fontSize: 12, color: '#8892a4', marginTop: 4 }}>registrations</div>
            </div>
            <div style={{ borderLeft: '1px solid #252b3a', paddingLeft: 32 }}>
              <div style={{ fontSize: 32, fontWeight: 800, color: '#8892a4', lineHeight: 1 }}>-</div>
              <div style={{ fontSize: 12, color: '#8892a4', marginTop: 4 }}>interest matches</div>
            </div>
          </div>
          <p style={{ fontSize: 12, color: '#4a5568', marginTop: 16 }}>
            Interest tag matching will appear once attendee profile data is available.
          </p>
        </Card>

        {/* Editable form */}
        <Card>
          <SectionTitle>Your sponsorship info</SectionTitle>
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

            <div>
              <label className={labelCls} htmlFor="sp-logo">Logo URL</label>
              <input
                id="sp-logo"
                type="url"
                placeholder="https://company.com/logo.png"
                value={form.logo_url}
                onChange={(e) => handleChange('logo_url', e.target.value)}
                className={inputCls}
              />
              <p style={{ fontSize: 11, color: '#4a5568', marginTop: 4 }}>
                A direct URL to your company logo (PNG or SVG preferred, at least 200x200px).
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label className={labelCls} htmlFor="sp-contact-name">Contact name</label>
                <input
                  id="sp-contact-name"
                  type="text"
                  placeholder="Jane Smith"
                  value={form.contact_name}
                  onChange={(e) => handleChange('contact_name', e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls} htmlFor="sp-contact-email">Contact email</label>
                <input
                  id="sp-contact-email"
                  type="email"
                  placeholder="jane@company.com"
                  value={form.contact_email}
                  onChange={(e) => handleChange('contact_email', e.target.value)}
                  className={inputCls}
                />
              </div>
            </div>

            <div>
              <label className={labelCls} htmlFor="sp-website">Company website</label>
              <input
                id="sp-website"
                type="url"
                placeholder="https://company.com"
                value={form.website_url}
                onChange={(e) => handleChange('website_url', e.target.value)}
                className={inputCls}
              />
            </div>

            <div>
              <label className={labelCls} htmlFor="sp-description">Company description</label>
              <textarea
                id="sp-description"
                rows={4}
                placeholder="Briefly describe your company and what you do..."
                value={form.description}
                onChange={(e) => handleChange('description', e.target.value)}
                className={inputCls}
                style={{ resize: 'vertical', minHeight: 96 }}
              />
              <p style={{ fontSize: 11, color: '#4a5568', marginTop: 4 }}>
                This appears on the event website under your sponsorship listing.
              </p>
            </div>

            <div>
              <label className={labelCls} htmlFor="sp-booth-desc">Booth description</label>
              <textarea
                id="sp-booth-desc"
                rows={3}
                placeholder="Describe what attendees can expect at your booth..."
                value={form.booth_description}
                onChange={(e) => handleChange('booth_description', e.target.value)}
                className={inputCls}
                style={{ resize: 'vertical', minHeight: 80 }}
              />
            </div>

            {saveStatus === 'error' && (
              <div style={{ background: '#1f0a0a', border: '1px solid #7f1d1d', borderRadius: 6, padding: '10px 12px' }}>
                <p style={{ fontSize: 13, color: '#fca5a5', margin: 0 }}>{saveError}</p>
              </div>
            )}

            {saveStatus === 'saved' && (
              <div style={{ background: '#0a1f10', border: '1px solid #166534', borderRadius: 6, padding: '10px 12px' }}>
                <p style={{ fontSize: 13, color: '#86efac', margin: 0 }}>Changes saved successfully.</p>
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: 4 }}>
              <button
                type="submit"
                disabled={saveStatus === 'saving'}
                className="px-5 py-2 rounded-md bg-[#38bdf8] text-black text-sm font-semibold"
                style={{ opacity: saveStatus === 'saving' ? 0.6 : 1, cursor: saveStatus === 'saving' ? 'wait' : 'pointer' }}
              >
                {saveStatus === 'saving' ? 'Saving...' : 'Save changes'}
              </button>
              <span style={{ fontSize: 12, color: '#4a5568' }}>
                Changes are visible to event organizers immediately.
              </span>
            </div>
          </form>
        </Card>

        <div style={{ marginTop: 32, textAlign: 'center' }}>
          <p style={{ fontSize: 12, color: '#4a5568' }}>
            Questions about your sponsorship?{' '}
            <a href="/contact" style={{ color: '#38bdf8', textDecoration: 'none' }}>Contact us</a>
          </p>
        </div>
      </div>
    </div>
  )
}
