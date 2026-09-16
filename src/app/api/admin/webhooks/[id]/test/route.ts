import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function serviceRole() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function boardSession() {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null
  const { data: member } = await supabase
    .from('members')
    .select('role')
    .eq('id', session.user.id)
    .single()
  if (member?.role !== 'board') return null
  return session
}

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const session = await boardSession()
  if (!session) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const admin = serviceRole()
  const { data: webhook, error } = await admin
    .from('discord_webhooks')
    .select('webhook_url')
    .eq('id', params.id)
    .single()

  if (error || !webhook) {
    return NextResponse.json({ error: 'webhook not found' }, { status: 404 })
  }

  const testPayload = {
    embeds: [
      {
        title: 'Test Notification',
        description: 'Test notification from NODE Sudbury admin panel',
        color: 0x38bdf8,
        footer: { text: 'NODE Sudbury' },
      },
    ],
  }

  try {
    const res = await fetch(webhook.webhook_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testPayload),
    })
    if (res.ok || res.status === 204) {
      return NextResponse.json({ ok: true })
    }
    const text = await res.text().catch(() => '')
    return NextResponse.json(
      { error: `Discord returned HTTP ${res.status}: ${text}` },
      { status: 502 }
    )
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
