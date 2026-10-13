export const dynamic = 'force-dynamic'

import { createClient } from '@supabase/supabase-js'
import { CalendarWidget } from './CalendarWidget'

interface Props {
  searchParams: { chapter?: string; type?: string; limit?: string; theme?: string }
}

export default async function EmbedCalendarPage({ searchParams }: Props) {
  const theme = searchParams.theme === 'light' ? 'light' : 'dark'
  const limit = Math.min(parseInt(searchParams.limit ?? '5', 10) || 5, 20)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://nodesudbury.com'

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  let query = supabase
    .from('events')
    .select('id, title, slug, type, starts_at, event_locations(name)')
    .eq('status', 'published')
    .gt('starts_at', new Date().toISOString())
    .order('starts_at', { ascending: true })
    .limit(limit)

  if (searchParams.type) {
    query = query.eq('type', searchParams.type)
  }

  const { data: events } = await query

  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>{`* { box-sizing: border-box; margin: 0; padding: 0; } body { margin: 0; }`}</style>
      </head>
      <body>
        <CalendarWidget events={(events as any) ?? []} theme={theme} appUrl={appUrl} />
      </body>
    </html>
  )
}
