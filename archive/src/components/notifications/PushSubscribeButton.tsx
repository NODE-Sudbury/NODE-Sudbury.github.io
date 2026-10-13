'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

function keyToBase64(key: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(key)))
}

export default function PushSubscribeButton() {
  const [supported, setSupported] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setLoading(false)
      return
    }
    setSupported(true)
    setPermission(Notification.permission)

    // Only wait for .ready if a SW is already registered - otherwise .ready hangs forever
    ;(async () => {
      try {
        const regs = await navigator.serviceWorker.getRegistrations()
        if (regs.length === 0) {
          setLoading(false)
          return
        }
        const reg = await navigator.serviceWorker.ready
        const sub = await reg.pushManager.getSubscription()
        setSubscribed(!!sub)
      } catch {
        // ignore - browser may not support or SW may be broken
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  async function subscribe() {
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    if (!vapidKey) {
      setError('Push notifications not configured.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      await navigator.serviceWorker.register('/sw.js')
      const reg = await navigator.serviceWorker.ready
      const perm = await Notification.requestPermission()
      setPermission(perm)
      if (perm !== 'granted') {
        setLoading(false)
        return
      }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
      })
      const p256dh = sub.getKey('p256dh')
      const auth = sub.getKey('auth')
      if (!p256dh || !auth) throw new Error('Missing push keys')
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: sub.endpoint,
          p256dh: keyToBase64(p256dh),
          auth: keyToBase64(auth),
        }),
      })
      setSubscribed(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to subscribe')
    } finally {
      setLoading(false)
    }
  }

  async function unsubscribe() {
    setLoading(true)
    setError(null)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await sub.unsubscribe()
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        })
      }
      setSubscribed(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to unsubscribe')
    } finally {
      setLoading(false)
    }
  }

  if (!supported) return null

  const label =
    loading ? 'Loading...' :
    permission === 'denied' ? 'Blocked' :
    subscribed ? 'Notifications On' :
    'Enable Notifications'

  return (
    <div className="flex flex-col gap-1">
      <Button
        onClick={subscribed ? unsubscribe : subscribe}
        disabled={loading || permission === 'denied'}
        variant={subscribed ? 'default' : 'outline'}
        className={subscribed ? 'bg-[#f0e6d3] text-black hover:bg-[#e8dcc8]' : ''}
      >
        {label}
      </Button>
      {permission === 'denied' && (
        <p className="text-xs text-muted-foreground">
          Notifications are blocked. Allow them in your browser settings.
        </p>
      )}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}
