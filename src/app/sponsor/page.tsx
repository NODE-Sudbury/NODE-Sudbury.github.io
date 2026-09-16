'use client'

import { useState } from 'react'

const inputCls =
  'w-full rounded-md border border-[#252b3a] bg-[#0d1117] px-3 py-2 text-sm text-white placeholder:text-[#4a5568] focus:outline-none focus:ring-1 focus:ring-[#38bdf8]'
const labelCls = 'block text-xs font-medium text-[#8892a4] mb-1'

export default function SponsorLandingPage() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    setErrorMsg('')

    try {
      const res = await fetch('/api/sponsor/request-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok) {
        setErrorMsg(data.error ?? 'Something went wrong. Please try again.')
        setStatus('error')
        return
      }
      setStatus('sent')
    } catch {
      setErrorMsg('Network error. Please try again.')
      setStatus('error')
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0f111a', color: '#e2e8f0', fontFamily: 'system-ui, sans-serif' }}>
      {/* Nav bar */}
      <nav style={{ borderBottom: '1px solid #1e2433', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 18, fontWeight: 700, color: '#e2e8f0', letterSpacing: '-0.02em' }}>NODE</span>
        <span style={{ color: '#252b3a', fontSize: 16 }}>/</span>
        <span style={{ fontSize: 14, color: '#8892a4' }}>Sponsor Portal</span>
      </nav>

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '80px 24px 48px' }}>

        {/* Hero */}
        <div style={{ marginBottom: 56 }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: '#1a1f2c',
            border: '1px solid #f59e0b33',
            borderRadius: 20,
            padding: '4px 12px',
            marginBottom: 20,
          }}>
            <span style={{ fontSize: 14 }}>&#9733;</span>
            <span style={{ fontSize: 12, color: '#f59e0b', fontWeight: 500 }}>Sponsor self-service</span>
          </div>

          <h1 style={{ fontSize: 40, fontWeight: 800, lineHeight: 1.15, marginBottom: 16, letterSpacing: '-0.03em' }}>
            Manage your<br />
            <span style={{ color: '#38bdf8' }}>sponsorship</span>
          </h1>
          <p style={{ fontSize: 16, color: '#8892a4', lineHeight: 1.7, maxWidth: 480 }}>
            Access your sponsor dashboard to update your company info, booth details, logo, and
            see real-time registration metrics for the events you support.
          </p>
        </div>

        {/* Feature list */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 56 }}>
          {[
            { icon: '&#9998;', label: 'Edit company profile', desc: 'Update your description, website, and contact info any time.' },
            { icon: '&#128202;', label: 'Attendee insights', desc: 'See registration counts and interest tags relevant to your industry.' },
            { icon: '&#127979;', label: 'Booth assignment', desc: 'View your booth number and floor location once assigned.' },
            { icon: '&#128247;', label: 'Logo upload', desc: 'Keep your logo and branding current for event materials.' },
          ].map((f) => (
            <div key={f.label} style={{ background: '#1a1f2c', border: '1px solid #252b3a', borderRadius: 10, padding: '18px 16px' }}>
              <div style={{ fontSize: 20, marginBottom: 8 }} dangerouslySetInnerHTML={{ __html: f.icon }} />
              <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0', marginBottom: 4 }}>{f.label}</div>
              <div style={{ fontSize: 12, color: '#8892a4', lineHeight: 1.5 }}>{f.desc}</div>
            </div>
          ))}
        </div>

        {/* Access form */}
        <div style={{ background: '#1a1f2c', border: '1px solid #252b3a', borderRadius: 12, padding: '32px 28px' }}>
          {status === 'sent' ? (
            <div style={{ textAlign: 'center', padding: '12px 0' }}>
              <div style={{ fontSize: 32, marginBottom: 16 }}>&#9993;</div>
              <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Check your email</h2>
              <p style={{ color: '#8892a4', fontSize: 14, lineHeight: 1.6, maxWidth: 360, margin: '0 auto 20px' }}>
                We sent a secure access link to <strong style={{ color: '#e2e8f0' }}>{email}</strong>.
                The link expires in 7 days.
              </p>
              <button
                onClick={() => { setStatus('idle'); setEmail('') }}
                className="px-5 py-2 rounded-md border border-[#252b3a] text-sm text-[#8892a4] hover:text-white"
              >
                Use a different email
              </button>
            </div>
          ) : (
            <>
              <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Access my portal</h2>
              <p style={{ color: '#8892a4', fontSize: 13, marginBottom: 24, lineHeight: 1.5 }}>
                Enter the email address associated with your sponsorship and we will send you a secure
                magic link - no password needed.
              </p>

              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: 16 }}>
                  <label className={labelCls} htmlFor="sponsor-email">Sponsorship email address</label>
                  <input
                    id="sponsor-email"
                    type="email"
                    required
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputCls}
                  />
                </div>

                {status === 'error' && (
                  <div style={{ background: '#1f0a0a', border: '1px solid #7f1d1d', borderRadius: 6, padding: '10px 12px', marginBottom: 16 }}>
                    <p style={{ fontSize: 13, color: '#fca5a5', margin: 0 }}>{errorMsg}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={status === 'loading'}
                  className="px-5 py-2 rounded-md bg-[#38bdf8] text-black text-sm font-semibold"
                  style={{ opacity: status === 'loading' ? 0.6 : 1, cursor: status === 'loading' ? 'wait' : 'pointer' }}
                >
                  {status === 'loading' ? 'Sending...' : 'Send magic link'}
                </button>
              </form>
            </>
          )}
        </div>

        <p style={{ fontSize: 12, color: '#4a5568', marginTop: 24, textAlign: 'center' }}>
          Not a sponsor yet?{' '}
          <a href="/contact" style={{ color: '#38bdf8', textDecoration: 'none' }}>Get in touch</a> to learn about sponsorship opportunities.
        </p>
      </div>
    </div>
  )
}
