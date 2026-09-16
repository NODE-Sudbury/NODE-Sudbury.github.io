import { createClient } from '@supabase/supabase-js'
import { sendEventReminder } from '@/lib/email'

export const dynamic = 'force-dynamic'

function serviceRole() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function authHeader(req: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return true // dev: skip auth
  const auth = req.headers.get('authorization')
  return auth === `Bearer ${secret}`
}

export async function GET(req: Request) {
  if (!authHeader(req)) {
    return new Response('Unauthorized', { status: 401 })
  }

  const supabase = serviceRole()
  const now = new Date()
  const results: string[] = []

  // Windows: 1w (168h ± 2h), 1d (24h ± 2h), 1h (1h ± 30min)
  const windows = [
    { label: 'reminder_1w', hoursUntil: 168, windowHours: 2 },
    { label: 'reminder_1d', hoursUntil: 24,  windowHours: 2 },
    { label: 'reminder_1h', hoursUntil: 1,   windowHours: 0.5 },
  ]

  for (const w of windows) {
    const low  = new Date(now.getTime() + (w.hoursUntil - w.windowHours) * 3600_000)
    const high = new Date(now.getTime() + (w.hoursUntil + w.windowHours) * 3600_000)

    const { data: events } = await supabase
      .from('events')
      .select('id, title, slug, starts_at, ends_at, description, event_locations(name)')
      .eq('status', 'published')
      .gte('starts_at', low.toISOString())
      .lte('starts_at', high.toISOString())

    if (!events || events.length === 0) continue

    for (const ev of events) {
      // Get confirmed registrations not yet sent this reminder type
      const { data: regs } = await supabase
        .from('registrations')
        .select('member_id')
        .eq('event_id', ev.id)
        .eq('status', 'confirmed')

      if (!regs || regs.length === 0) continue

      // Cross-reference with email_logs to skip already-sent
      const memberIds = regs.map(r => r.member_id)
      const { data: alreadySent } = await supabase
        .from('email_logs')
        .select('member_id')
        .eq('event_id', ev.id)
        .eq('email_type', w.label)
        .in('member_id', memberIds)

      const sentSet = new Set((alreadySent ?? []).map(r => r.member_id))
      const pending = regs.filter(r => !sentSet.has(r.member_id))
      if (pending.length === 0) continue

      const locationName = (ev.event_locations as any)?.name ?? null
      const eventInfo = { ...ev, location: locationName }
      const logs: object[] = []

      await Promise.allSettled(
        pending.map(async (reg) => {
          const { data: auth } = await supabase.auth.admin.getUserById(reg.member_id)
          const email = auth?.user?.email
          if (!email) return

          const { data: member } = await supabase
            .from('members')
            .select('display_name')
            .eq('id', reg.member_id)
            .single()

          const name = member?.display_name || email.split('@')[0]
          await sendEventReminder(email, name, eventInfo, w.hoursUntil)
          logs.push({ member_id: reg.member_id, email, email_type: w.label, event_id: ev.id })
        })
      )

      if (logs.length > 0) {
        await supabase.from('email_logs').insert(logs)
        results.push(`${w.label}: ${logs.length} emails for "${ev.title}"`)
      }
    }
  }

  return Response.json({ ok: true, sent: results })
}
