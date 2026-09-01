import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { WebhooksClient } from './WebhooksClient'

export const dynamic = 'force-dynamic'

function serviceRole() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export default async function WebhooksPage() {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const { data: member } = await supabase
    .from('members')
    .select('role')
    .eq('id', session.user.id)
    .single()

  if (member?.role !== 'board') redirect('/dashboard')

  const admin = serviceRole()

  const { data: webhooks } = await admin
    .from('discord_webhooks')
    .select('id, event_id, chapter_id, webhook_url, is_active, created_at, events(title, slug)')
    .order('created_at', { ascending: false })

  const { data: events } = await admin
    .from('events')
    .select('id, title, slug')
    .order('starts_at', { ascending: false })
    .limit(50)

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#e2e8f0] mb-1">Webhooks</h1>
      <p className="text-sm text-[#8892a4] mb-8">
        Manage Discord webhook integrations for event notifications.
      </p>
      <WebhooksClient initialWebhooks={(webhooks ?? []) as any[]} events={events ?? []} />
    </div>
  )
}
