import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { sendEmail } from '@/lib/email'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  let body: {
    registration_id: string
    guardian_name: string
    guardian_email: string
    guardian_phone?: string
    relationship: string
  }
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }

  const { registration_id, guardian_name, guardian_email, guardian_phone, relationship } = body
  if (!registration_id || !guardian_name || !guardian_email || !relationship) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 })
  }

  // Fetch member
  const { data: member } = await supabase
    .from('members')
    .select('id, display_name')
    .eq('user_id', session.user.id)
    .single()
  if (!member) return NextResponse.json({ error: 'member_not_found' }, { status: 404 })

  // Verify registration belongs to this member
  const { data: reg } = await supabase
    .from('registrations')
    .select('id, event_id, events(id, title, starts_at, slug)')
    .eq('id', registration_id)
    .eq('member_id', member.id)
    .single()
  if (!reg) return NextResponse.json({ error: 'registration_not_found' }, { status: 404 })

  const event = Array.isArray(reg.events) ? reg.events[0] : reg.events as { title: string; starts_at: string; slug: string } | null
  const eventTitle = event?.title ?? 'NODE Event'
  const eventDate = event?.starts_at
    ? new Date(event.starts_at).toLocaleDateString('en-CA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    : 'TBD'

  const consent_token = crypto.randomUUID()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://nodesudbury.com'

  // Insert consent record
  const { error: insertError } = await supabase
    .from('minor_consent_records')
    .upsert({
      event_id: reg.event_id,
      member_id: member.id,
      registration_id,
      guardian_name,
      guardian_email,
      guardian_phone: guardian_phone ?? null,
      relationship,
      consent_given: false,
      consent_token,
    }, { onConflict: 'registration_id' })

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })

  // Update registration status
  await supabase
    .from('registrations')
    .update({ status: 'pending_consent' })
    .eq('id', registration_id)

  // Send guardian email
  const childName = member.display_name ?? session.user.email ?? 'your child'
  const confirmUrl = `${appUrl}/consent/${consent_token}`

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Parental Consent Required</title>
<style>body{margin:0;padding:0;background:#f4f7fb;font-family:system-ui,sans-serif}
.wrap{max-width:560px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)}
.header{background:#0f172a;padding:28px 32px;text-align:center}
.header h1{color:#38bdf8;margin:0;font-size:22px;letter-spacing:.08em}
.body{padding:32px}.body p{margin:0 0 16px;line-height:1.6;color:#374151}
.btn{display:inline-block;padding:12px 28px;border-radius:8px;font-weight:700;font-size:15px;text-decoration:none;margin:4px}
.btn-confirm{background:#38bdf8;color:#0f172a}
.btn-decline{background:#fee2e2;color:#991b1b}
.footer{padding:20px 32px;text-align:center;font-size:12px;color:#9ca3af;border-top:1px solid #f3f4f6}
</style></head><body><div class="wrap">
<div class="header"><h1>NODE Sudbury</h1></div>
<div class="body">
<p>Dear ${guardian_name},</p>
<p><strong>${childName}</strong> has registered for an upcoming NODE Sudbury event and requires your consent as their ${relationship}.</p>
<p><strong>Event:</strong> ${eventTitle}<br><strong>Date:</strong> ${eventDate}</p>
<p>NODE Sudbury is a technology community organization in Greater Sudbury, Ontario. By confirming consent, you acknowledge that ${childName} may attend this event.</p>
<p style="text-align:center;margin-top:24px">
  <a href="${confirmUrl}?action=confirm" class="btn btn-confirm">Confirm Consent</a>
  <a href="${confirmUrl}?action=decline" class="btn btn-decline">Decline</a>
</p>
<p style="font-size:13px;color:#6b7d96">Or visit: ${confirmUrl}</p>
</div>
<div class="footer">NODE Sudbury &bull; <a href="${appUrl}" style="color:#38bdf8">nodesudbury.com</a></div>
</div></body></html>`

  await sendEmail(guardian_email, `Parental Consent Required - ${eventTitle}`, html)

  return NextResponse.json({ success: true }, { status: 201 })
}
