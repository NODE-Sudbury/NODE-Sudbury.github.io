import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

type EventType =
  | 'event.published'
  | 'event.rsvp_open'
  | 'hackathon.submission_closed'
  | 'hackathon.results_published'
  | 'announcement'

interface DispatchBody {
  event_type: EventType
  payload: {
    title?: string
    description?: string
    url?: string
    [key: string]: unknown
  }
}

function serviceRole() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: Request) {
  let body: DispatchBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  const { event_type, payload } = body
  if (!event_type || !payload) {
    return NextResponse.json({ error: 'event_type and payload are required' }, { status: 400 })
  }

  const admin = serviceRole()
  const { data: webhooks, error } = await admin
    .from('discord_webhooks')
    .select('id, webhook_url')
    .eq('is_active', true)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!webhooks || webhooks.length === 0) {
    return NextResponse.json({ dispatched: 0, failed: 0 })
  }

  const discordPayload = {
    embeds: [
      {
        title: payload.title ?? event_type,
        description: payload.description ?? '',
        color: 0x38bdf8,
        url: payload.url ?? undefined,
        footer: { text: 'NODE Sudbury' },
      },
    ],
  }

  let dispatched = 0
  let failed = 0

  await Promise.allSettled(
    webhooks.map(async (wh) => {
      try {
        const res = await fetch(wh.webhook_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(discordPayload),
        })
        if (res.ok || res.status === 204) {
          dispatched++
        } else {
          failed++
          console.error(`[webhook] dispatch failed for ${wh.id}: HTTP ${res.status}`)
        }
      } catch (err) {
        failed++
        console.error(`[webhook] dispatch error for ${wh.id}:`, err)
      }
    })
  )

  return NextResponse.json({ dispatched, failed })
}
