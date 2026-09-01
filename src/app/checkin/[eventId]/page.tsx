'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams } from 'next/navigation'
import { createBrowserClient } from '@supabase/auth-helpers-nextjs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import Link from 'next/link'

interface Attendee {
  rsvp_id: string
  member_id: string
  full_name: string | null
  avatar_url: string | null
  checked_in_at: string | null
}

// ── IndexedDB helpers for attendee cache ──
const IDB_DB_NAME = 'checkin-attendees-db'
const IDB_STORE = 'attendees'

function openAttendeesDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_DB_NAME, 1)
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(IDB_STORE)) {
        req.result.createObjectStore(IDB_STORE, { keyPath: 'event_id' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function saveAttendeesToIDB(eventId: string, attendees: Attendee[]) {
  try {
    const db = await openAttendeesDB()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite')
      tx.objectStore(IDB_STORE).put({ event_id: eventId, attendees, cached_at: Date.now() })
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch (_) { /* ignore storage errors */ }
}

async function loadAttendeesFromIDB(eventId: string): Promise<Attendee[] | null> {
  try {
    const db = await openAttendeesDB()
    return new Promise((resolve) => {
      const tx = db.transaction(IDB_STORE, 'readonly')
      const req = tx.objectStore(IDB_STORE).get(eventId)
      req.onsuccess = () => {
        const record = req.result as { event_id: string; attendees: Attendee[] } | undefined
        resolve(record ? record.attendees : null)
      }
      req.onerror = () => resolve(null)
    })
  } catch (_) { return null }
}

// ── QR helpers ──
function parseAttendeeId(qrText: string): string | null {
  // Try to extract a UUID
  const uuidMatch = qrText.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)
  if (uuidMatch) return uuidMatch[0]
  // Try last path segment of a URL-like string
  if (qrText.includes('/')) {
    const parts = qrText.split('/')
    const last = parts[parts.length - 1].trim()
    if (last) return last
  }
  return qrText.trim() || null
}

// ── Component ──
export default function CheckinEvent() {
  const { eventId } = useParams<{ eventId: string }>()
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const [event, setEvent] = useState<any>(null)
  const [attendees, setAttendees] = useState<Attendee[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [checking, setChecking] = useState<string | null>(null)
  const [isOnline, setIsOnline] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [scanStatus, setScanStatus] = useState<string | null>(null)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const animFrameRef = useRef<number | null>(null)
  const scanningRef = useRef(false)

  // ── Online/offline detection ──
  useEffect(() => {
    setIsOnline(navigator.onLine)
    const onOnline = () => setIsOnline(true)
    const onOffline = () => setIsOnline(false)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  // ── Load attendees (network then IDB fallback) ──
  const load = useCallback(async () => {
    try {
      const [{ data: ev }, { data: regs }] = await Promise.all([
        supabase.from('events').select('id, title, starts_at, max_capacity').eq('id', eventId).single(),
        supabase.from('registrations')
          .select('id, member_id, checked_in_at, members(full_name, avatar_url)')
          .eq('event_id', eventId)
          .in('status', ['confirmed', 'checked_in'])
          .order('created_at'),
      ])
      setEvent(ev)
      const mapped: Attendee[] = (regs ?? []).map((r: any) => ({
        rsvp_id: r.id,
        member_id: r.member_id,
        full_name: r.members?.full_name ?? null,
        avatar_url: r.members?.avatar_url ?? null,
        checked_in_at: r.checked_in_at ?? null,
      }))
      setAttendees(mapped)
      await saveAttendeesToIDB(eventId, mapped)
    } catch (_) {
      // Offline or error - fall back to IndexedDB cache
      const cached = await loadAttendeesFromIDB(eventId)
      if (cached) setAttendees(cached)
    }
    setLoading(false)
  }, [eventId])

  useEffect(() => { load() }, [load])

  // ── Manual check-in toggle (existing behaviour) ──
  async function toggleCheckin(rsvpId: string, currentlyCheckedIn: boolean) {
    setChecking(rsvpId)
    const checked_in_at = currentlyCheckedIn ? null : new Date().toISOString()
    await supabase.from('registrations').update({ checked_in_at }).eq('id', rsvpId)
    setAttendees((prev) =>
      prev.map((a) => a.rsvp_id === rsvpId ? { ...a, checked_in_at } : a)
    )
    setChecking(null)
  }

  // ── QR-triggered check-in (via API endpoint) ──
  async function checkinByQR(attendeeId: string) {
    setScanStatus('Checking in...')
    try {
      const res = await fetch(`/api/admin/events/${eventId}/checkin/${attendeeId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      if (res.status === 202) {
        setScanStatus('Queued offline - will sync when back online')
      } else if (res.ok) {
        setScanStatus('Checked in!')
        await load()
      } else {
        setScanStatus('Check-in failed - try the manual list')
      }
    } catch (_) {
      setScanStatus('Offline - queued for sync')
    }
    stopQRScan()
    setTimeout(() => setScanStatus(null), 3500)
  }

  // ── Camera / QR scanner ──
  function stopQRScan() {
    scanningRef.current = false
    setScanning(false)
    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current)
      animFrameRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }

  async function startQRScan() {
    setScanStatus(null)
    setScanning(true)
    scanningRef.current = true

    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
    } catch (_) {
      setScanStatus('Camera access denied')
      setScanning(false)
      scanningRef.current = false
      return
    }
    streamRef.current = stream

    if (videoRef.current) {
      videoRef.current.srcObject = stream
      await videoRef.current.play()
    }

    // Load jsQR as fallback when BarcodeDetector is unavailable
    const hasBarcodeDetector = typeof (window as any).BarcodeDetector !== 'undefined'
    if (!hasBarcodeDetector && !(window as any).jsQR) {
      await new Promise<void>((resolve) => {
        const script = document.createElement('script')
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jsQR/1.4.0/jsQR.min.js'
        script.onload = () => resolve()
        script.onerror = () => resolve()
        document.head.appendChild(script)
      })
    }

    const detector = hasBarcodeDetector
      ? new (window as any).BarcodeDetector({ formats: ['qr_code'] })
      : null
    const jsQR: ((d: Uint8ClampedArray, w: number, h: number) => { data: string } | null) | null =
      hasBarcodeDetector ? null : ((window as any).jsQR ?? null)

    const tick = async () => {
      if (!scanningRef.current) return
      const video = videoRef.current
      const canvas = canvasRef.current
      if (!video || !canvas || video.readyState < video.HAVE_ENOUGH_DATA) {
        animFrameRef.current = requestAnimationFrame(tick)
        return
      }

      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')
      if (!ctx) { animFrameRef.current = requestAnimationFrame(tick); return }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

      let qrText: string | null = null

      if (detector) {
        try {
          const codes: Array<{ rawValue: string }> = await detector.detect(canvas)
          if (codes.length > 0) qrText = codes[0].rawValue
        } catch (_) { /* detection error - continue scanning */ }
      } else if (jsQR) {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const result = jsQR(imageData.data, imageData.width, imageData.height)
        if (result) qrText = result.data
      }

      if (qrText) {
        const attendeeId = parseAttendeeId(qrText)
        if (attendeeId) {
          await checkinByQR(attendeeId)
          return
        }
      }

      animFrameRef.current = requestAnimationFrame(tick)
    }

    animFrameRef.current = requestAnimationFrame(tick)
  }

  // Stop camera on unmount
  useEffect(() => () => stopQRScan(), [])

  const filtered = attendees.filter((a) =>
    !search || a.full_name?.toLowerCase().includes(search.toLowerCase())
  )
  const checkedInCount = attendees.filter((a) => a.checked_in_at).length

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading...</p>
  }

  return (
    <div className="space-y-5">
      {/* Offline banner */}
      {!isOnline && (
        <div className="rounded-md bg-yellow-500/10 border border-yellow-500/30 px-4 py-3 text-sm text-yellow-700 dark:text-yellow-300">
          Working offline - check-ins will sync when connection returns
        </div>
      )}

      {/* Back + event header */}
      <div>
        <Link href="/checkin" className="text-xs text-muted-foreground hover:text-foreground">
          &larr; All events
        </Link>
        <h1 className="text-lg font-semibold mt-2">{event?.title}</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          {new Date(event?.starts_at).toLocaleDateString('en-CA', {
            weekday: 'long', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
          })}
        </p>
        <p className="text-sm font-medium mt-2">
          {checkedInCount} / {attendees.length} checked in
          {event?.max_capacity && ` (capacity ${event.max_capacity})`}
        </p>
      </div>

      {/* QR scanner controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={scanning ? stopQRScan : startQRScan}
          className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors ${
            scanning
              ? 'bg-red-500/10 text-red-600 border border-red-500/30 hover:bg-red-500/20'
              : 'bg-[#f0e6d3] text-[#0a0a0a] hover:bg-[#e8d9c0]'
          }`}
        >
          {scanning ? 'Stop Scan' : 'Scan QR'}
        </button>
        {scanStatus && (
          <span className="text-sm text-muted-foreground">{scanStatus}</span>
        )}
      </div>

      {/* Camera view */}
      {scanning && (
        <div className="relative rounded-lg overflow-hidden bg-black aspect-video max-w-sm">
          <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
          <canvas ref={canvasRef} className="hidden" />
          {/* Targeting reticle */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-48 h-48 border-2 border-[#f0e6d3] rounded-lg opacity-70" />
          </div>
        </div>
      )}

      {/* Search */}
      <Input
        placeholder="Search attendee name..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full"
        autoFocus={!scanning}
      />

      {/* Attendee list */}
      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          {search ? 'No attendees match that name.' : 'No RSVPs yet.'}
        </p>
      ) : (
        <div className="space-y-2">
          {filtered.map((a) => {
            const initials = a.full_name?.split(' ').map((n) => n[0]).join('').toUpperCase() ?? '?'
            const checkedIn = !!a.checked_in_at
            return (
              <div
                key={a.rsvp_id}
                className={`flex items-center gap-3 rounded-lg border px-4 py-3 transition-colors ${
                  checkedIn
                    ? 'border-[#f0e6d3]/30 bg-[#f0e6d3]/5'
                    : 'border-border bg-transparent'
                }`}
              >
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarImage src={a.avatar_url ?? undefined} />
                  <AvatarFallback className="text-sm">{initials}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{a.full_name ?? 'Unknown'}</p>
                  {checkedIn && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Checked in {new Date(a.checked_in_at!).toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => toggleCheckin(a.rsvp_id, checkedIn)}
                  disabled={checking === a.rsvp_id}
                  className={`shrink-0 px-4 py-2 rounded-md text-sm font-semibold transition-colors disabled:opacity-50 ${
                    checkedIn
                      ? 'bg-muted text-muted-foreground hover:bg-muted/80'
                      : 'bg-[#f0e6d3] text-[#0a0a0a] hover:bg-[#e8d9c0]'
                  }`}
                >
                  {checking === a.rsvp_id ? '...' : checkedIn ? 'Undo' : 'Check in'}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
