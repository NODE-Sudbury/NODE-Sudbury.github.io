import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

function serviceRole() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function authClient() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
}

function escapeCsvField(value: string | null | undefined): string {
  const str = value == null ? '' : String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return '"' + str.replace(/"/g, '""') + '"'
  }
  return str
}

function rowToCsv(fields: (string | null | undefined)[]): string {
  return fields.map(escapeCsvField).join(',')
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = authClient()
  const { data: { session } } = await auth.auth.getSession()

  if (!session) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { data: member } = await auth
    .from('members')
    .select('role')
    .eq('user_id', session.user.id)
    .single()

  if (!member || !['board', 'admin'].includes(member.role ?? '')) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { searchParams } = new URL(req.url)
  const format = searchParams.get('format') ?? 'csv'

  if (format !== 'csv') {
    return new Response(JSON.stringify({ error: 'Only format=csv is supported' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const eventId = params.id
  const svc = serviceRole()

  const { data: regs, error } = await svc
    .from('registrations')
    .select(`
      id,
      status,
      dietary_notes,
      tshirt_size,
      accessibility_needs,
      swag_collected,
      ticket_tier_id,
      members ( full_name, email ),
      ticket_tiers ( name )
    `)
    .eq('event_id', eventId)
    .order('created_at', { ascending: true })

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const header = rowToCsv([
    'name',
    'email',
    'dietary_notes',
    'tshirt_size',
    'accessibility_needs',
    'swag_collected',
    'status',
    'ticket_tier',
  ])

  const lines: string[] = [header]

  for (const reg of regs ?? []) {
    const memberData = reg.members as { full_name?: string; email?: string } | null
    const tierData = reg.ticket_tiers as { name?: string } | null

    const dietaryNotes = Array.isArray(reg.dietary_notes)
      ? reg.dietary_notes.join('; ')
      : (reg.dietary_notes ?? '')

    lines.push(
      rowToCsv([
        memberData?.full_name ?? '',
        memberData?.email ?? '',
        dietaryNotes,
        reg.tshirt_size ?? '',
        reg.accessibility_needs ?? '',
        reg.swag_collected ? 'yes' : 'no',
        reg.status ?? '',
        tierData?.name ?? '',
      ])
    )
  }

  const csv = lines.join('\r\n')

  return new Response(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="logistics-${eventId}.csv"`,
    },
  })
}
