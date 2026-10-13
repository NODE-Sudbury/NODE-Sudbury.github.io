export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type')
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '5', 10) || 5, 20)

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  let query = supabase
    .from('events')
    .select('id, title, slug, type, starts_at, ends_at, event_locations(name, city, is_virtual)')
    .eq('status', 'published')
    .gt('starts_at', new Date().toISOString())
    .order('starts_at', { ascending: true })
    .limit(limit)

  if (type) query = query.eq('type', type)

  const { data: events, error } = await query

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch events' }, {
      status: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
    })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://nodesudbury.com'
  const payload = (events ?? []).map((e: any) => ({
    ...e,
    url: `${appUrl}/events/${e.slug}`,
  }))

  return NextResponse.json(payload, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, s-maxage=300',
    },
  })
}
