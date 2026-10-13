'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/auth-helpers-nextjs'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

type TicketType = {
  id: string
  name: string
  description: string | null
  pricing_model: string
  price_cents: number
  quantity_available: number | null
  quantity_sold: number
  is_active: boolean
}

const DIETARY_OPTIONS = ['Vegetarian', 'Vegan', 'Gluten-Free', 'Halal', 'Kosher', 'Nut Allergy', 'Dairy-Free', 'No Restrictions']
const TSHIRT_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL']
const ACCESSIBILITY_OPTIONS = [
  'ASL interpreter',
  'CART captioning',
  'Wheelchair accessible seating',
  'Hearing loop / FM system',
  'Large print materials',
]

const NEEDS_ADVANCE_NOTICE = ['ASL interpreter', 'CART captioning']

interface RegisterModalProps {
  event: {
    id: string
    title: string
    slug: string
    starts_at: string
    max_capacity: number | null
    collect_dietary?: boolean
    collect_tshirt_size?: boolean
    collect_accessibility?: boolean
    requires_minor_consent?: boolean
  }
  ticketTypes: TicketType[]
  open: boolean
  onClose: () => void
  memberDietary?: string[]
  memberTshirt?: string
  /** Optional ticket tier ID selected by the user before opening the modal */
  selectedTierId?: string
}

type Stage = 'select' | 'confirm' | 'logistics' | 'waitlist' | 'success' | 'paid' | 'consent'

function formatPrice(t: TicketType) {
  if (t.pricing_model === 'free' || t.pricing_model === 'donation') return 'Free'
  if (t.pricing_model === 'member_only') return 'Members only'
  return `$${(t.price_cents / 100).toFixed(2)} CAD`
}

function spotsLeft(t: TicketType) {
  if (t.quantity_available === null) return null
  return t.quantity_available - (t.quantity_sold ?? 0)
}

export default function RegisterModal({ event, ticketTypes, open, onClose, memberDietary = [], memberTshirt = '', selectedTierId }: RegisterModalProps) {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const [stage, setStage] = useState<Stage>('select')
  const [selected, setSelected] = useState<TicketType | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [regId, setRegId] = useState<string | null>(null)
  const [isWaitlisted, setIsWaitlisted] = useState(false)
  const [redirecting, setRedirecting] = useState(false)
  const [guardianName, setGuardianName] = useState('')
  const [guardianEmail, setGuardianEmail] = useState('')
  const [guardianPhone, setGuardianPhone] = useState('')
  const [guardianRelationship, setGuardianRelationship] = useState('parent')
  const [consentSent, setConsentSent] = useState(false)
  const [dietary, setDietary] = useState<string[]>(memberDietary)
  const [tshirt, setTshirt] = useState(memberTshirt)
  const [accessibilityNeeds, setAccessibilityNeeds] = useState<string[]>([])
  const [showInDirectory, setShowInDirectory] = useState(false)
  const [openToConnect, setOpenToConnect] = useState(false)
  // Tracks whether the user is in the paid pre-checkout flow
  const [paidFlow, setPaidFlow] = useState(false)

  // Always show the logistics stage so directory opt-ins are always collected
  const needsLogistics = true

  const available = ticketTypes.filter(t => {
    if (!t.is_active) return false
    const left = spotsLeft(t)
    return left === null || left > 0
  })

  const showAdvanceNoticeWarning = accessibilityNeeds.some(n => NEEDS_ADVANCE_NOTICE.includes(n))

  // Detect ?registration=success on redirect back from Stripe
  useEffect(() => {
    if (!open) return
    const params = new URLSearchParams(window.location.search)
    if (params.get('registration') === 'success') {
      setStage('success')
      setIsWaitlisted(false)
    }
  }, [open])

  function handleClose() {
    setStage('select')
    setSelected(null)
    setError(null)
    setLoading(false)
    setPaidFlow(false)
    setGuardianName('')
    setGuardianEmail('')
    setGuardianPhone('')
    setGuardianRelationship('parent')
    setConsentSent(false)
    setAccessibilityNeeds([])
    setShowInDirectory(false)
    setOpenToConnect(false)
    onClose()
  }

  async function selectTicket(t: TicketType) {
    setSelected(t)
    setError(null)

    if (t.pricing_model === 'paid') {
      // Auth check first - same as free path
      setLoading(true)
      const session = await checkSession()
      setLoading(false)
      if (!session) {
        setError('not_logged_in')
        return // Stay on select stage and show sign-in prompt
      }
      setPaidFlow(true)
      // Route through consent -> logistics -> paid (confirmation)
      if (event.requires_minor_consent) {
        setStage('consent')
      } else if (needsLogistics) {
        setStage('logistics')
      } else {
        setStage('paid')
      }
      return
    }

    setStage(needsLogistics ? 'logistics' : 'confirm')
  }

  async function startStripeCheckout() {
    if (!selected) return
    setRedirecting(true)
    setError(null)
    try {
      const res = await fetch('/api/events/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketTypeId: selected.id,
          tierId: selectedTierId,
          dietary_notes: dietary.length ? dietary : undefined,
          tshirt_size: tshirt || undefined,
          accessibility_needs: accessibilityNeeds.length ? JSON.stringify(accessibilityNeeds) : undefined,
          guardian_name: guardianName || undefined,
          guardian_email: guardianEmail || undefined,
          guardian_phone: guardianPhone || undefined,
          guardian_relationship: guardianRelationship || undefined,
          show_in_directory: showInDirectory,
          open_to_connect: openToConnect,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? 'Something went wrong. Please try again.')
        setRedirecting(false)
        return
      }
      window.location.href = json.url
    } catch {
      setError('Network error. Please try again.')
      setRedirecting(false)
    }
  }

  async function checkSession() {
    const { data } = await supabase.auth.getSession()
    return data.session
  }

  async function submit(waitlist = false) {
    if (!selected) return
    setLoading(true)
    setError(null)

    const session = await checkSession()
    if (!session) {
      setLoading(false)
      setError('not_logged_in')
      return
    }

    try {
      const res = await fetch('/api/events/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketTypeId: selected.id,
          tierId: selectedTierId,
          waitlist,
          dietary_notes: dietary.length ? dietary : undefined,
          tshirt_size: tshirt || undefined,
          accessibility_needs: accessibilityNeeds.length ? JSON.stringify(accessibilityNeeds) : undefined,
          show_in_directory: showInDirectory,
          open_to_connect: openToConnect,
        }),
      })
      const json = await res.json()

      if (res.status === 409 && json.error === 'already_registered') {
        setError('already_registered')
        setLoading(false)
        return
      }
      if (res.status === 409 && json.error === 'event_full') {
        setStage('waitlist')
        setLoading(false)
        return
      }
      if (!res.ok) {
        setError(json.error ?? 'Something went wrong. Please try again.')
        setLoading(false)
        return
      }

      setRegId(json.registration?.id ?? null)
      setIsWaitlisted(json.registration?.status === 'waitlisted')
      if (event.requires_minor_consent && json.registration?.id) {
        setStage('consent')
      } else {
        setStage('success')
      }
    } catch {
      setError('Network error. Please try again.')
    }
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose() }}>
      <DialogContent className="bg-[#13161f] border-[#252b3a] text-[#c9d1e8] max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white text-base font-semibold leading-snug">
            {stage === 'success' ? (isWaitlisted ? 'You are on the waitlist' : 'You are registered') : stage === 'consent' ? 'Parental Consent Required' : `Register for ${event.title}`}
          </DialogTitle>
        </DialogHeader>

        <Separator className="bg-[#252b3a]" />

        {/* Select ticket */}
        {stage === 'select' && (
          <div className="space-y-2 pt-1">
            {available.length === 0 ? (
              <p className="text-sm text-[#5a6278] py-4 text-center">No tickets available.</p>
            ) : (
              available.map(t => {
                const left = spotsLeft(t)
                return (
                  <button
                    key={t.id}
                    onClick={() => selectTicket(t)}
                    disabled={loading}
                    className="w-full text-left px-4 py-3 rounded-lg border border-[#252b3a] bg-[#0b0e14] hover:border-[#f0e6d3]/30 hover:bg-[#1a1f2c] transition-all disabled:opacity-60"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-white">{t.name}</span>
                      <span className="text-xs font-semibold text-[#9ece6a]">{formatPrice(t)}</span>
                    </div>
                    {t.description && <p className="text-xs text-[#5a6278] mt-0.5 leading-snug">{t.description}</p>}
                    {left !== null && left < 10 && (
                      <p className="text-[10px] text-[#e0af68] mt-1">{left} spot{left !== 1 ? 's' : ''} left</p>
                    )}
                  </button>
                )
              })
            )}
            {/* Auth error shown inline on the select stage for paid tickets */}
            {error === 'not_logged_in' && (
              <div className="text-sm text-[#f7768e] bg-[#f7768e]/10 px-3 py-2 rounded-md">
                You need to{' '}
                <Link href={`/login?next=/events/${event.slug}`} className="underline text-[#f0e6d3]">sign in</Link>
                {' '}to register.
              </div>
            )}
            {loading && (
              <p className="text-xs text-[#5a6278] text-center py-1">Checking session...</p>
            )}
          </div>
        )}

        {/* Pre-payment consent collection (paid flow only - no regId yet) */}
        {stage === 'consent' && !regId && (
          <div className="space-y-4 pt-1">
            <p className="text-sm text-[#5a6278]">
              This event requires parental or guardian consent for attendees under 18. Provide your guardian&apos;s details so we can follow up after payment.
            </p>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Guardian full name *"
                value={guardianName}
                onChange={e => setGuardianName(e.target.value)}
                className="w-full bg-[#0b0e14] border border-[#252b3a] rounded-lg px-3 py-2 text-sm text-white placeholder-[#5a6278] focus:outline-none focus:border-sky-500"
              />
              <input
                type="email"
                placeholder="Guardian email address *"
                value={guardianEmail}
                onChange={e => setGuardianEmail(e.target.value)}
                className="w-full bg-[#0b0e14] border border-[#252b3a] rounded-lg px-3 py-2 text-sm text-white placeholder-[#5a6278] focus:outline-none focus:border-sky-500"
              />
              <input
                type="tel"
                placeholder="Guardian phone (optional)"
                value={guardianPhone}
                onChange={e => setGuardianPhone(e.target.value)}
                className="w-full bg-[#0b0e14] border border-[#252b3a] rounded-lg px-3 py-2 text-sm text-white placeholder-[#5a6278] focus:outline-none focus:border-sky-500"
              />
              <select
                value={guardianRelationship}
                onChange={e => setGuardianRelationship(e.target.value)}
                className="w-full bg-[#0b0e14] border border-[#252b3a] rounded-lg px-3 py-2 text-sm text-white"
              >
                <option value="parent">Parent</option>
                <option value="guardian">Legal Guardian</option>
                <option value="other">Other</option>
              </select>
            </div>
            {error && <p className="text-sm text-[#f7768e]">{error}</p>}
            <div className="flex gap-2 pt-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setStage('select'); setPaidFlow(false); setError(null) }}
                className="flex-1 text-[#5a6278] hover:text-[#c9d1e8] border border-[#252b3a]"
              >
                Back
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  // Skip consent - clear fields and move on
                  setGuardianName(''); setGuardianEmail(''); setGuardianPhone(''); setGuardianRelationship('parent')
                  setStage(needsLogistics ? 'logistics' : 'paid')
                }}
                className="flex-1 text-[#5a6278] hover:text-[#c9d1e8] border border-[#252b3a]"
              >
                Skip
              </Button>
              <Button
                size="sm"
                disabled={!guardianName || !guardianEmail}
                onClick={() => setStage(needsLogistics ? 'logistics' : 'paid')}
                className="flex-1 bg-sky-500 hover:bg-sky-400 text-black font-semibold"
              >
                Continue
              </Button>
            </div>
          </div>
        )}

        {/* Logistics step */}
        {stage === 'logistics' && (
          <div className="space-y-4 pt-1">
            <p className="text-xs text-[#5a6278]">A few more details to help us prepare.</p>
            {event.collect_dietary && (
              <div>
                <p className="text-xs font-semibold text-[#c9d1e8] mb-2">Dietary Restrictions</p>
                <div className="flex flex-wrap gap-1.5">
                  {DIETARY_OPTIONS.map(opt => (
                    <button key={opt} type="button"
                      onClick={() => setDietary(prev => prev.includes(opt) ? prev.filter(o => o !== opt) : [...prev, opt])}
                      className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${dietary.includes(opt) ? 'bg-sky-500/20 border-sky-500 text-sky-300' : 'bg-[#0b0e14] border-[#252b3a] text-[#5a6278] hover:border-[#3a4255]'}`}
                    >{opt}</button>
                  ))}
                </div>
              </div>
            )}
            {event.collect_tshirt_size && (
              <div>
                <p className="text-xs font-semibold text-[#c9d1e8] mb-2">T-Shirt Size</p>
                <div className="flex gap-1.5 flex-wrap">
                  {TSHIRT_SIZES.map(s => (
                    <button key={s} type="button"
                      onClick={() => setTshirt(prev => prev === s ? '' : s)}
                      className={`w-12 py-1.5 rounded text-xs font-medium border transition-colors ${tshirt === s ? 'bg-sky-500/20 border-sky-500 text-sky-300' : 'bg-[#0b0e14] border-[#252b3a] text-[#5a6278]'}`}
                    >{s}</button>
                  ))}
                </div>
              </div>
            )}
            {event.collect_accessibility && (
              <div>
                <p className="text-xs font-semibold text-[#c9d1e8] mb-2">Accessibility Needs</p>
                <div className="space-y-2">
                  {ACCESSIBILITY_OPTIONS.map(opt => (
                    <label key={opt} className="flex items-center gap-2.5 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={accessibilityNeeds.includes(opt)}
                        onChange={() =>
                          setAccessibilityNeeds(prev =>
                            prev.includes(opt) ? prev.filter(n => n !== opt) : [...prev, opt]
                          )
                        }
                        className="w-4 h-4 rounded border border-[#252b3a] bg-[#0b0e14] accent-sky-500 cursor-pointer"
                      />
                      <span className="text-xs text-[#c9d1e8] group-hover:text-white transition-colors">{opt}</span>
                    </label>
                  ))}
                </div>
                {showAdvanceNoticeWarning && (
                  <div className="mt-2.5 px-3 py-2 rounded-md bg-[#e0af68]/10 border border-[#e0af68]/30 text-xs text-[#e0af68] leading-snug">
                    Note: ASL/CART services require 21+ days notice. We will contact you to confirm availability.
                  </div>
                )}
              </div>
            )}

            <Separator className="bg-[#252b3a]" />

            {/* Directory opt-in checkboxes */}
            <div className="space-y-2.5">
              <label className="flex items-start gap-2.5 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={showInDirectory}
                  onChange={e => setShowInDirectory(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border border-[#252b3a] bg-[#0b0e14] accent-sky-500 cursor-pointer flex-shrink-0"
                />
                <span className="text-xs text-[#c9d1e8] group-hover:text-white transition-colors leading-snug">
                  Add me to the event attendee directory{' '}
                  <span className="text-[#5a6278]">(visible to other confirmed attendees for 14 days after the event)</span>
                </span>
              </label>
              <label className="flex items-start gap-2.5 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={openToConnect}
                  onChange={e => setOpenToConnect(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border border-[#252b3a] bg-[#0b0e14] accent-sky-500 cursor-pointer flex-shrink-0"
                />
                <span className="text-xs text-[#c9d1e8] group-hover:text-white transition-colors leading-snug">
                  I am open to connect / networking with other attendees
                </span>
              </label>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (paidFlow) {
                    setStage(event.requires_minor_consent ? 'consent' : 'select')
                    if (!event.requires_minor_consent) setPaidFlow(false)
                  } else {
                    setStage('select')
                  }
                  setError(null)
                }}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                size="sm"
                onClick={() => setStage(paidFlow ? 'paid' : 'confirm')}
                className="flex-1 bg-sky-500 hover:bg-sky-400 text-black font-semibold"
              >
                Continue
              </Button>
            </div>
          </div>
        )}

        {/* Confirm (free tickets) */}
        {stage === 'confirm' && selected && (
          <div className="space-y-4 pt-1">
            <div className="px-4 py-3 rounded-lg bg-[#0b0e14] border border-[#252b3a]">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-white">{selected.name}</span>
                <span className="text-xs font-semibold text-[#9ece6a]">{formatPrice(selected)}</span>
              </div>
              <p className="text-xs text-[#5a6278] mt-0.5">
                {new Date(event.starts_at).toLocaleDateString('en-CA', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'America/Toronto' })}
              </p>
            </div>

            {error === 'not_logged_in' && (
              <div className="text-sm text-[#f7768e] bg-[#f7768e]/10 px-3 py-2 rounded-md">
                You need to{' '}
                <Link href={`/login?next=/events/${event.slug}`} className="underline text-[#f0e6d3]">sign in</Link>
                {' '}to register.
              </div>
            )}
            {error === 'already_registered' && (
              <p className="text-sm text-[#e0af68]">You are already registered for this event.</p>
            )}
            {error && error !== 'not_logged_in' && error !== 'already_registered' && (
              <p className="text-sm text-[#f7768e]">{error}</p>
            )}

            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setStage('select'); setError(null) }}
                className="flex-1 text-[#5a6278] hover:text-[#c9d1e8] border border-[#252b3a]"
                disabled={loading}
              >
                Back
              </Button>
              <Button
                size="sm"
                onClick={() => submit(false)}
                disabled={loading}
                className="flex-1 bg-[#f0e6d3] text-[#0b0e14] hover:bg-[#e8ddc8] font-medium"
              >
                {loading ? 'Registering...' : 'Confirm registration'}
              </Button>
            </div>
          </div>
        )}

        {/* Paid - summary + Stripe redirect (reached only after auth + consent + logistics) */}
        {stage === 'paid' && selected && (
          <div className="space-y-4 pt-1">
            <div className="px-4 py-3 rounded-lg bg-[#0b0e14] border border-[#252b3a]">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-white">{selected.name}</span>
                <span className="text-xs font-semibold text-[#9ece6a]">${(selected.price_cents / 100).toFixed(2)} CAD</span>
              </div>
              <p className="text-xs text-[#5a6278] mt-0.5">
                {new Date(event.starts_at).toLocaleDateString('en-CA', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'America/Toronto' })}
              </p>
            </div>
            <p className="text-xs text-[#5a6278]">You will be redirected to Stripe to complete payment securely.</p>
            {error && <p className="text-sm text-[#f7768e]">{error}</p>}
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setError(null)
                  if (needsLogistics) {
                    setStage('logistics')
                  } else if (event.requires_minor_consent) {
                    setStage('consent')
                  } else {
                    setStage('select')
                    setPaidFlow(false)
                  }
                }}
                className="flex-1 text-[#5a6278] hover:text-[#c9d1e8] border border-[#252b3a]"
                disabled={redirecting}
              >
                Back
              </Button>
              <Button
                size="sm"
                onClick={startStripeCheckout}
                disabled={redirecting}
                className="flex-1 bg-[#f0e6d3] text-[#0b0e14] hover:bg-[#e8ddc8] font-medium"
              >
                {redirecting ? 'Redirecting...' : 'Continue to payment'}
              </Button>
            </div>
          </div>
        )}

        {/* Waitlist prompt */}
        {stage === 'waitlist' && (
          <div className="space-y-4 pt-1">
            <p className="text-sm text-[#c9d1e8]">
              This ticket type is currently full. Would you like to join the waitlist? You will be notified if a spot opens up.
            </p>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setStage('select'); setError(null) }}
                className="flex-1 text-[#5a6278] hover:text-[#c9d1e8] border border-[#252b3a]"
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => submit(true)}
                disabled={loading}
                className="flex-1 bg-[#f0e6d3] text-[#0b0e14] hover:bg-[#e8ddc8] font-medium"
              >
                {loading ? 'Joining...' : 'Join waitlist'}
              </Button>
            </div>
          </div>
        )}

        {/* Post-registration consent request (free flow - regId is set) */}
        {stage === 'consent' && regId && (
          <div className="space-y-4 pt-1">
            {consentSent ? (
              <div className="px-4 py-3 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sm text-sky-300">
                Consent request sent to your guardian&apos;s email. Your registration will be confirmed once they approve.
              </div>
            ) : (
              <>
                <p className="text-sm text-gray-400">
                  This event requires parental or guardian consent for attendees under 18. Please provide your guardian&apos;s details below.
                </p>
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Guardian full name *"
                    value={guardianName}
                    onChange={e => setGuardianName(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500"
                  />
                  <input
                    type="email"
                    placeholder="Guardian email address *"
                    value={guardianEmail}
                    onChange={e => setGuardianEmail(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500"
                  />
                  <input
                    type="tel"
                    placeholder="Guardian phone (optional)"
                    value={guardianPhone}
                    onChange={e => setGuardianPhone(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500"
                  />
                  <select
                    value={guardianRelationship}
                    onChange={e => setGuardianRelationship(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
                  >
                    <option value="parent">Parent</option>
                    <option value="guardian">Legal Guardian</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                {error && <p className="text-red-400 text-xs">{error}</p>}
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setStage('success')} className="flex-1 text-gray-400">Skip for now</Button>
                  <Button
                    size="sm"
                    disabled={loading || !guardianName || !guardianEmail}
                    onClick={async () => {
                      setLoading(true); setError(null)
                      try {
                        const res = await fetch('/api/consent/request', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ registration_id: regId, guardian_name: guardianName, guardian_email: guardianEmail, guardian_phone: guardianPhone || undefined, relationship: guardianRelationship }),
                        })
                        if (res.ok) setConsentSent(true)
                        else { const j = await res.json(); setError(j.error ?? 'Failed to send consent request') }
                      } catch { setError('Network error') }
                      setLoading(false)
                    }}
                    className="flex-1 bg-sky-500 hover:bg-sky-400 text-black font-semibold"
                  >
                    {loading ? 'Sending...' : 'Send Consent Request'}
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        {stage === 'success' && (
          <div className="space-y-4 pt-1">
            <div className="px-4 py-3 rounded-lg bg-[#9ece6a]/10 border border-[#9ece6a]/20 text-sm text-[#9ece6a]">
              {isWaitlisted
                ? "You are on the waitlist. We will email you if a spot becomes available."
                : "You are registered! See you there."}
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                className="flex-1 text-[#5a6278] hover:text-[#c9d1e8] border border-[#252b3a]"
              >
                Close
              </Button>
              <Link href="/dashboard" className="flex-1">
                <Button
                  size="sm"
                  className="w-full bg-[#f0e6d3] text-[#0b0e14] hover:bg-[#e8ddc8] font-medium"
                >
                  View in dashboard
                </Button>
              </Link>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
