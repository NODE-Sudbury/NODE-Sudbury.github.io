'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import PushSubscribeButton from '@/components/notifications/PushSubscribeButton'

const INTERESTS = [
  'AI/ML', 'Web Dev', 'Cloud', 'Security', 'Open Source',
  'Hardware', 'Game Dev', 'Data', 'Career', 'Community',
  'Mobile', 'DevOps', 'Blockchain', 'IoT',
]

interface Props {
  initialName: string
  initialBio: string
  initialInterests: string[]
}

export function OnboardingWizard({ initialName, initialBio, initialInterests }: Props) {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [fullName, setFullName] = useState(initialName)
  const [bio, setBio] = useState(initialBio)
  const [interests, setInterests] = useState<string[]>(initialInterests)

  const progress = (step / 4) * 100

  function toggleInterest(tag: string) {
    setInterests(prev =>
      prev.includes(tag) ? prev.filter(i => i !== tag) : [...prev, tag]
    )
  }

  async function complete() {
    if (!fullName.trim() || fullName.trim().length < 2) {
      setError('Display name must be at least 2 characters.')
      setStep(2)
      return
    }
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/onboarding/complete', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: fullName.trim(), bio: bio.trim(), interests }),
      })
      if (!res.ok) throw new Error('Failed to save')
      router.push('/dashboard')
    } catch {
      setError('Something went wrong. Please try again.')
      setSaving(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0b1120', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ width: '100%', maxWidth: 520 }}>

        {/* Progress bar */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontFamily: 'system-ui', fontSize: 13, color: '#6b7d96' }}>
              Step {step} of 4
            </span>
            <span style={{ fontFamily: 'system-ui', fontSize: 13, color: '#38bdf8' }}>
              {Math.round(progress)}%
            </span>
          </div>
          <div style={{ height: 4, background: '#1e2d45', borderRadius: 999 }}>
            <div style={{
              height: '100%', background: '#38bdf8', borderRadius: 999,
              width: `${progress}%`, transition: 'width 0.3s ease',
            }} />
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: '#111827', border: '1px solid #1e2d45', borderRadius: 16,
          padding: '40px 36px', transition: 'opacity 0.2s ease',
        }}>

          {/* Step 1: Welcome */}
          {step === 1 && (
            <div>
              <div style={{ fontSize: 40, marginBottom: 16 }}>👋</div>
              <h1 style={{ fontFamily: 'system-ui', fontWeight: 800, fontSize: 28, color: '#f8fafc', marginBottom: 16 }}>
                Welcome to NODE Sudbury!
              </h1>
              <p style={{ fontFamily: 'system-ui', fontSize: 16, color: '#94a3b8', lineHeight: 1.6, marginBottom: 12 }}>
                NODE is Greater Sudbury&apos;s tech community - connecting builders, designers, and founders through meetups, hackathons, and workshops.
              </p>
              <p style={{ fontFamily: 'system-ui', fontSize: 16, color: '#94a3b8', lineHeight: 1.6, marginBottom: 32 }}>
                Let&apos;s take a minute to set up your profile so the community can get to know you.
              </p>
              <button onClick={() => setStep(2)} style={btnStyle}>
                Let&apos;s get started
              </button>
            </div>
          )}

          {/* Step 2: Profile */}
          {step === 2 && (
            <div>
              <h2 style={headingStyle}>Your Profile</h2>
              <p style={subStyle}>This is how other members will see you.</p>

              {error && <p style={{ color: '#f87171', fontSize: 14, marginBottom: 16 }}>{error}</p>}

              <label style={labelStyle}>Display Name <span style={{ color: '#f87171' }}>*</span></label>
              <input
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Your name"
                style={inputStyle}
              />

              <label style={labelStyle}>Bio <span style={{ color: '#6b7d96' }}>(optional)</span></label>
              <textarea
                value={bio}
                onChange={e => setBio(e.target.value.slice(0, 200))}
                placeholder="A sentence or two about yourself..."
                rows={3}
                style={{ ...inputStyle, resize: 'vertical' }}
              />
              <div style={{ fontSize: 12, color: '#6b7d96', textAlign: 'right', marginTop: -8, marginBottom: 16 }}>
                {bio.length}/200
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <button onClick={() => setStep(1)} style={backBtnStyle}>Back</button>
                <button
                  onClick={() => {
                    if (!fullName.trim() || fullName.trim().length < 2) {
                      setError('Display name must be at least 2 characters.')
                      return
                    }
                    setError('')
                    setStep(3)
                  }}
                  style={btnStyle}
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Interests */}
          {step === 3 && (
            <div>
              <h2 style={headingStyle}>Your Interests</h2>
              <p style={subStyle}>Pick what you&apos;re into - we&apos;ll surface relevant events for you.</p>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 32 }}>
                {INTERESTS.map(tag => {
                  const selected = interests.includes(tag)
                  return (
                    <button
                      key={tag}
                      onClick={() => toggleInterest(tag)}
                      style={{
                        padding: '8px 16px',
                        borderRadius: 999,
                        border: selected ? '1px solid #38bdf8' : '1px solid #1e2d45',
                        background: selected ? 'rgba(56,189,248,0.12)' : '#1a2540',
                        color: selected ? '#38bdf8' : '#94a3b8',
                        fontFamily: 'system-ui',
                        fontSize: 14,
                        fontWeight: selected ? 600 : 400,
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                    >
                      {tag}
                    </button>
                  )
                })}
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <button onClick={() => setStep(2)} style={backBtnStyle}>Back</button>
                <button onClick={() => setStep(4)} style={btnStyle}>Next</button>
              </div>
            </div>
          )}

          {/* Step 4: Notifications */}
          {step === 4 && (
            <div>
              <h2 style={headingStyle}>Stay Connected</h2>
              <p style={subStyle}>Get notified about upcoming events and community updates.</p>

              <div style={{
                background: '#1a2540', border: '1px solid #1e2d45', borderRadius: 12,
                padding: 24, marginBottom: 32,
              }}>
                <p style={{ fontFamily: 'system-ui', fontSize: 15, color: '#d8e3f0', marginBottom: 16 }}>
                  Enable browser notifications to hear about new events, badge awards, and connection requests.
                </p>
                <PushSubscribeButton />
              </div>

              {error && <p style={{ color: '#f87171', fontSize: 14, marginBottom: 16 }}>{error}</p>}

              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <button onClick={() => setStep(3)} style={backBtnStyle}>Back</button>
                <button onClick={complete} disabled={saving} style={{ ...btnStyle, opacity: saving ? 0.6 : 1 }}>
                  {saving ? 'Saving...' : 'Complete Setup'}
                </button>
                <button
                  onClick={complete}
                  disabled={saving}
                  style={{ background: 'none', border: 'none', color: '#6b7d96', fontSize: 14, cursor: 'pointer', fontFamily: 'system-ui' }}
                >
                  Skip for now
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const btnStyle: React.CSSProperties = {
  padding: '12px 28px',
  background: '#38bdf8',
  color: '#0b1120',
  border: 'none',
  borderRadius: 8,
  fontFamily: 'system-ui',
  fontSize: 15,
  fontWeight: 700,
  cursor: 'pointer',
  flex: 1,
}

const backBtnStyle: React.CSSProperties = {
  padding: '12px 20px',
  background: '#1a2540',
  color: '#94a3b8',
  border: '1px solid #1e2d45',
  borderRadius: 8,
  fontFamily: 'system-ui',
  fontSize: 15,
  cursor: 'pointer',
}

const headingStyle: React.CSSProperties = {
  fontFamily: 'system-ui',
  fontWeight: 800,
  fontSize: 24,
  color: '#f8fafc',
  marginBottom: 8,
}

const subStyle: React.CSSProperties = {
  fontFamily: 'system-ui',
  fontSize: 15,
  color: '#94a3b8',
  marginBottom: 24,
  lineHeight: 1.5,
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontFamily: 'system-ui',
  fontSize: 14,
  fontWeight: 600,
  color: '#d8e3f0',
  marginBottom: 6,
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  background: '#1a2540',
  border: '1px solid #1e2d45',
  borderRadius: 8,
  color: '#f8fafc',
  fontFamily: 'system-ui',
  fontSize: 15,
  marginBottom: 16,
  boxSizing: 'border-box',
  outline: 'none',
}
