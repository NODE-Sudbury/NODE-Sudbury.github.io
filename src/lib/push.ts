import { createClient } from '@supabase/supabase-js'

export async function sendPushNotification(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: { title: string; body: string; url?: string; tag?: string }
): Promise<boolean> {
  // Stub - full VAPID sending requires the web-push package (not installed).
  // Install with: npm install web-push
  // Then replace this with: webpush.sendNotification(subscription, JSON.stringify(payload))
  console.log('[Push] Would send to:', subscription.endpoint, payload)
  return true
}

export async function sendPushToMember(
  memberId: string,
  payload: { title: string; body: string; url?: string; tag?: string }
): Promise<void> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('member_id', memberId)
  if (!subs) return
  await Promise.allSettled(subs.map((sub) => sendPushNotification(sub, payload)))
}

export async function broadcastPush(
  payload: { title: string; body: string; url?: string; tag?: string }
): Promise<void> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
  if (!subs) return
  await Promise.allSettled(subs.map((sub) => sendPushNotification(sub, payload)))
}
