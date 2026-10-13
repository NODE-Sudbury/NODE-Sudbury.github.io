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

export async function GET() {
  const session = await boardSession()
  if (!session) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const admin = serviceRole()
  const { data, error } = await admin
    .from('discord_webhooks')
    .select('id, event_id, chapter_id, webhook_url, is_active, created_at, events(title, slug)')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ webhooks: data })
}

export async function POST(request: Request) {
  const session = await boardSession()
  if (!session) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const { webhook_url, event_id, is_active } = await request.json()
  if (!webhook_url) return NextResponse.json({ error: 'webhook_url required' }, { status: 400 })

  const admin = serviceRole()
  const { data, error } = await admin
    .from('discord_webhooks')
    .insert({
      webhook_url,
      event_id: event_id ?? null,
      chapter_id: '00000000-0000-0000-0000-000000000001',
      is_active: is_active ?? true,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ webhook: data }, { status: 201 })
}
