import { createClient } from '@supabase/supabase-js'
import { sendWaitlistPromotion } from '@/lib/email'

export const dynamic = 'force-dynamic'

function serviceRole() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function authHeader(req: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return true
  const auth = req.headers.get('authorization')
  return auth === `Bearer ${secret}`
}

export async function GET(req: Request) {
  if (!authHeader(req)) {
    return new Response('Unauthorized', { status: 401 })
  }

  const supabase = serviceRole()

  // Find registrations that were recently promoted from waitlist:
  // confirmed within the last 10 minutes, but no 'waitlist_promo' email logged.
  const tenMinAgo = new Date(Date.now() - 10 * 60_000).toISOString()

  const { data: regs } = await supabase
    .from('registrations')
    .select('id, member_id, event_id, events(id, title, slug, starts_at, ends_at, description, event_locations(name))')
    .eq('status', 'confirmed')
    .gte('updated_at', tenMinAgo)

  if (!regs || regs.length === 0) {
    return Response.json({ ok: true, sent: 0 })
  }

  // Filter to those without a 'waitlist_promo' log and who had a 'waitlist_confirm'
  // (meaning they were originally waitlisted)
  const candidates = await Promise.all(
    regs.map(async (reg) => {
      const [{ data: promoLog }, { data: waitlistLog }] = await Promise.all([
        supabase.from('email_logs').select('id').eq('event_id', reg.event_id).eq('member_id', reg.member_id).eq('email_type', 'waitlist_promo').maybeSingle(),
        supabase.from('email_logs').select('id').eq('event_id', reg.event_id).eq('member_id', reg.member_id).eq('email_type', 'waitlist_confirm').maybeSingle(),
      ])
      // Only email those originally on waitlist and not yet sent promo email
      if (waitlistLog && !promoLog) return reg
      return null
    })
  )

  const toSend = candidates.filter(Boolean) as typeof regs

  let sent = 0
  await Promise.allSettled(
    toSend.map(async (reg) => {
      const { data: auth } = await supabase.auth.admin.getUserById(reg.member_id)
      const email = auth?.user?.email
      if (!email) return

      const { data: member } = await supabase.from('members').select('display_name').eq('id', reg.member_id).single()
      const name = member?.display_name || email.split('@')[0]

      const ev = Array.isArray(reg.events) ? reg.events[0] : reg.events as any
      if (!ev) return

      const locationName = (ev.event_locations as any)?.name ?? null
      await sendWaitlistPromotion(email, name, { ...ev, location: locationName })

      await supabase.from('email_logs').insert({
        member_id: reg.member_id,
        email,
        email_type: 'waitlist_promo',
        event_id: reg.event_id,
      })
      sent++
    })
  )

  return Response.json({ ok: true, sent })
}
