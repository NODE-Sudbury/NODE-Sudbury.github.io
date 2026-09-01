export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { AdminEventsClient } from './AdminEventsClient'

export default async function AdminEventsPage() {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const [{ data: events }, { data: locations }] = await Promise.all([
    supabase
      .from('events')
      .select('id, title, slug, type, status, starts_at, ends_at, max_capacity, location_id, event_locations(name), ticket_types(id, name, pricing_model, price_cents, quantity_available, quantity_sold)')
      .is('deleted_at', null)
      .order('starts_at', { ascending: false }),
    supabase
      .from('event_locations')
      .select('id, name')
      .order('name'),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Events</h1>
        <p className="text-sm text-muted-foreground mt-1">Create and manage NODE events.</p>
      </div>
      <AdminEventsClient events={(events ?? []) as any[]} locations={locations ?? []} />
    </div>
  )
}
