'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import PushSubscribeButton from '@/components/notifications/PushSubscribeButton'

interface Pref {
  channel: string
  type: string
  enabled: boolean
}

interface Props {
  prefs: Pref[]
  memberId: string
}

const CHANNELS = ['email', 'push', 'in_app']
const TYPES = [
  { key: 'event_reminder', label: 'Event reminders' },
  { key: 'registration_confirmed', label: 'Registration confirmed' },
  { key: 'waitlist_promoted', label: 'Moved off waitlist' },
  { key: 'badge_earned', label: 'Badge earned' },
  { key: 'connection_request', label: 'Connection requests' },
  { key: 'mentorship_request', label: 'Mentorship requests' },
  { key: 'cfp_status', label: 'CFP status updates' },
]

export default function NotifPrefsClient({ prefs: initial, memberId }: Props) {
  type PrefMap = Record<string, Record<string, boolean>>
  const buildMap = (p: Pref[]): PrefMap => {
    const m: PrefMap = {}
    for (const { channel, type, enabled } of p) {
      if (!m[type]) m[type] = {}
      m[type][channel] = enabled
    }
    return m
  }

  const [map, setMap] = useState<PrefMap>(buildMap(initial))
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  function toggle(type: string, channel: string) {
    setMap((prev) => ({
      ...prev,
      [type]: { ...prev[type], [channel]: !(prev[type]?.[channel] ?? true) },
    }))
    setSaved(false)
  }

  async function save() {
    setSaving(true)
    const flat: Pref[] = []
    for (const [type, channels] of Object.entries(map)) {
      for (const [channel, enabled] of Object.entries(channels)) {
        flat.push({ channel, type, enabled })
      }
    }
    await fetch('/api/notifications/prefs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prefs: flat }),
    })
    setSaving(false)
    setSaved(true)
  }

  return (
    <div className="min-h-screen bg-background text-foreground px-4 py-8 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Notification Preferences</h1>
        <p className="text-muted-foreground text-sm mt-1">Choose how you want to be notified</p>
      </div>

      <Card className="bg-[#13161f] border-[#252b3a]">
        <CardContent className="pt-4">
          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-4 gap-y-0 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-3 px-1">
            <span>Type</span>
            {CHANNELS.map((c) => <span key={c} className="text-center capitalize">{c.replace('_', ' ')}</span>)}
          </div>
          <Separator className="mb-3" />
          {TYPES.map((t, i) => (
            <div key={t.key}>
              <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-4 items-center py-3 px-1">
                <span className="text-sm">{t.label}</span>
                {CHANNELS.map((c) => {
                  const on = map[t.key]?.[c] ?? true
                  return (
                    <button
                      key={c}
                      onClick={() => toggle(t.key, c)}
                      className={`w-10 h-5 rounded-full transition-colors mx-auto ${on ? 'bg-[#f0e6d3]' : 'bg-[#252b3a]'}`}
                    >
                      <span className={`block w-4 h-4 rounded-full bg-background transition-transform mx-0.5 ${on ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  )
                })}
              </div>
              {i < TYPES.length - 1 && <Separator />}
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="mt-6 flex items-center gap-3">
        <Button onClick={save} disabled={saving} className="bg-[#f0e6d3] text-black hover:bg-[#e8dcc8]">
          {saving ? 'Saving...' : 'Save preferences'}
        </Button>
        {saved && <span className="text-xs text-green-400">Saved!</span>}
      </div>

      <div className="mt-8">
        <h2 className="text-base font-semibold mb-1">Browser Notifications</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Get instant push notifications in your browser when events or badges are available.
        </p>
        <PushSubscribeButton />
      </div>
    </div>
  )
}
