import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { randomBytes } from 'crypto'

export const dynamic = 'force-dynamic'

function serviceRole() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function generateToken() {
  return randomBytes(16).toString('hex') // 32 hex chars
}

export async function POST(request: Request) {
  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }

  const { email } = body
  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'email_required' }, { status: 400 })
  }

  const normalizedEmail = email.trim().toLowerCase()
  const supabase = serviceRole()

  // Look up sponsor by contact email or the linked member email
  const { data: sponsors } = await supabase
    .from('event_sponsors')
    .select('id, contact_email, member:members(email)')
    .eq('is_active', true)

  if (!sponsors || sponsors.length === 0) {
    // Return generic success to avoid email enumeration
    return NextResponse.json({ ok: true })
  }

  // Find matching sponsor record(s)
  const matched = sponsors.filter((s) => {
    const contactMatch = ((s as any).contact_email ?? '').toLowerCase() === normalizedEmail
    const memberRaw = (s as any).member
    const memberEmail = Array.isArray(memberRaw) ? memberRaw[0]?.email : memberRaw?.email
    const memberMatch = (memberEmail ?? '').toLowerCase() === normalizedEmail
    return contactMatch || memberMatch
  })

  if (matched.length === 0) {
    return NextResponse.json({ ok: true })
  }

  const token = generateToken()
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  // Update all matched sponsor rows with the new token
  for (const s of matched) {
    await supabase
      .from('event_sponsors')
      .update({ portal_access_token: token, portal_token_expires_at: expiresAt })
      .eq('id', s.id)
  }

  const magicLink = `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/sponsor/${token}`

  // TODO: send via Resend once configured
  // import { Resend } from 'resend'
  // const resend = new Resend(process.env.RESEND_API_KEY)
  // await resend.emails.send({ from: ..., to: normalizedEmail, subject: '...', html: ... })

  // Return debug token in development only
  const isDev = process.env.NODE_ENV === 'development'

  return NextResponse.json({
    ok: true,
    ...(isDev ? { debug_token: token, debug_link: magicLink } : {}),
  })
}
