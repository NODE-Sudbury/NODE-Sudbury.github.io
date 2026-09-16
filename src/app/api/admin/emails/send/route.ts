import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: member } = await supabase
    .from('members')
    .select('role, email, full_name')
    .eq('id', session.user.id)
    .single()

  if (!member || !['board', 'admin'].includes(member.role)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json(
      { error: 'Email not configured - add RESEND_API_KEY to .env.local', sent: 0 },
      { status: 503 }
    )
  }

  const body = await request.json()
  const { event_id, subject, body: emailBody, test } = body

  if (!subject || !emailBody) {
    return NextResponse.json({ error: 'subject and body are required' }, { status: 400 })
  }

  if (emailBody.trim().length < 20) {
    return NextResponse.json({ error: 'body must be at least 20 characters' }, { status: 400 })
  }

  // Build HTML from the body (basic markdown-like rendering)
  const htmlBody = buildHtml(subject, emailBody)

  // Test send - only to the current user
  if (test) {
    const senderEmail = member.email || session.user.email
    if (!senderEmail) {
      return NextResponse.json({ error: 'Could not determine your email address' }, { status: 400 })
    }

    const result = await sendEmail({
      to: [senderEmail],
      subject: `[TEST] ${subject}`,
      html: htmlBody,
    })

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({ sent: 1, failed: 0 })
  }

  // Use service role to bypass RLS when fetching recipient emails
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Collect recipient emails
  let recipients: string[] = []

  if (event_id) {
    // Get confirmed registrations for this event
    const { data: registrations } = await admin
      .from('registrations')
      .select('member_id')
      .eq('event_id', event_id)
      .eq('status', 'confirmed')

    if (!registrations || registrations.length === 0) {
      return NextResponse.json({ sent: 0, failed: 0 })
    }

    const memberIds = registrations.map((r: any) => r.member_id).filter(Boolean)

    if (memberIds.length > 0) {
      const { data: authUsers } = await admin.auth.admin.listUsers()
      const userMap = Object.fromEntries((authUsers?.users ?? []).map((u: any) => [u.id, u.email]))
      recipients = memberIds.map((id: string) => userMap[id]).filter(Boolean)
    }
  } else {
    // All active members - get emails from auth.users via service role
    const { data: memberRows } = await admin
      .from('members')
      .select('id, email')

    const memberEmails = (memberRows ?? []).map((m: any) => m.email).filter(Boolean)

    if (memberEmails.length > 0) {
      recipients = memberEmails
    } else {
      // Fall back to auth.users if members table doesn't store email
      const { data: authUsers } = await admin.auth.admin.listUsers()
      recipients = (authUsers?.users ?? []).map((u: any) => u.email).filter(Boolean)
    }
  }

  if (recipients.length === 0) {
    return NextResponse.json({ sent: 0, failed: 0 })
  }

  // Send in batches of 50 (Resend allows up to 50 recipients per call)
  const BATCH_SIZE = 50
  let sent = 0
  let failed = 0

  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const batch = recipients.slice(i, i + BATCH_SIZE)
    const result = await sendEmail({ to: batch, subject, html: htmlBody })
    if (result.error) {
      failed += batch.length
    } else {
      sent += batch.length
    }
  }

  return NextResponse.json({ sent, failed })
}

async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string[]
  subject: string
  html: string
}): Promise<{ error?: string }> {
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL || 'NODE <hello@nodesudbury.com>',
        to,
        subject,
        html,
      }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      return { error: data.message || `Resend error ${res.status}` }
    }

    return {}
  } catch (e: any) {
    return { error: e.message || 'Network error contacting Resend' }
  }
}

function buildHtml(subject: string, md: string): string {
  // Convert markdown to HTML
  let content = md
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  content = content.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
  content = content.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  content = content.replace(/\*(.+?)\*/g, '<em>$1</em>')
  content = content.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" style="color:#0284c7">$1</a>')
  content = content.replace(/^### (.+)$/gm, '<h3 style="font-size:16px;font-weight:600;margin:16px 0 4px">$1</h3>')
  content = content.replace(/^## (.+)$/gm, '<h2 style="font-size:18px;font-weight:600;margin:20px 0 6px">$1</h2>')
  content = content.replace(/^# (.+)$/gm, '<h1 style="font-size:22px;font-weight:700;margin:24px 0 8px">$1</h1>')
  content = content.replace(/\n\n+/g, '</p><p style="margin:10px 0;line-height:1.6">')
  content = '<p style="margin:10px 0;line-height:1.6">' + content + '</p>'
  content = content.replace(/\n/g, '<br/>')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:system-ui,-apple-system,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 0">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08)">
          <tr>
            <td style="background:#0f172a;padding:24px 32px">
              <span style="font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-0.5px">NODE</span>
              <span style="font-size:12px;color:#64748b;margin-left:8px">Northern Ontario Dev Exchange</span>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;color:#1e293b;font-size:15px">
              ${content}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;border-top:1px solid #e2e8f0;background:#f8fafc">
              <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6">
                You received this because you are a registered member of NODE - Northern Ontario Dev Exchange.
                <br/>
                <a href="https://nodesudbury.com" style="color:#0284c7">nodesudbury.com</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
