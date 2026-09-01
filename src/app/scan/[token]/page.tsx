import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import ScanStampClient from './ScanStampClient'

export const dynamic = 'force-dynamic'

export default async function ScanPage({ params }: { params: { token: string } }) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  const { data: { session } } = await supabase.auth.getSession()

  const { data: station } = await supabase
    .from('scavenger_stations')
    .select('id, name, hint_text, points_value, sort_order, hunt_id, scavenger_hunts(id, title, event_id, is_active, starts_at, ends_at)')
    .eq('qr_token', params.token)
    .maybeSingle()

  if (!station) notFound()

  const hunt = Array.isArray(station.scavenger_hunts) ? station.scavenger_hunts[0] : station.scavenger_hunts
  if (!hunt) notFound()

  const now = new Date()
  const huntActive = hunt.is_active &&
    (!hunt.starts_at || new Date(hunt.starts_at) <= now) &&
    (!hunt.ends_at || new Date(hunt.ends_at) >= now)

  if (!huntActive) {
    return (
      <div className="min-h-screen bg-[#0b0e14] text-[#c9d1e8] flex items-center justify-center p-6">
        <div className="max-w-sm w-full text-center">
          <div className="text-4xl mb-4">🔒</div>
          <h1 className="text-xl font-semibold text-white mb-2">Station Inactive</h1>
          <p className="text-sm text-[#5a6278]">This scavenger hunt station is no longer active.</p>
        </div>
      </div>
    )
  }

  if (!session) {
    const redirectUrl = `/scan/${params.token}`
    return (
      <div className="min-h-screen bg-[#0b0e14] text-[#c9d1e8] flex items-center justify-center p-6">
        <div className="max-w-sm w-full">
          <div className="text-center mb-8">
            <div className="text-5xl mb-4">📍</div>
            <h1 className="text-xl font-semibold text-white mb-1">{station.name}</h1>
            <p className="text-sm text-[#5a6278]">{hunt.title}</p>
          </div>
          <div className="bg-[#13161f] border border-[#252b3a] rounded-xl p-6 text-center space-y-4">
            <p className="text-sm text-[#8892a4]">Sign in to collect this stamp and earn <span className="text-[#f0e6d3] font-medium">{station.points_value} points</span>.</p>
            <Link
              href={`/login?next=${encodeURIComponent(redirectUrl)}`}
              className="block w-full py-2.5 rounded-lg bg-[#f0e6d3] text-[#0b0e14] text-sm font-semibold text-center hover:bg-[#e8ddc8] transition-colors"
            >
              Sign in to collect
            </Link>
          </div>
          {station.hint_text && (
            <p className="mt-6 text-xs text-[#5a6278] text-center italic">{station.hint_text}</p>
          )}
        </div>
      </div>
    )
  }

  const { data: existingStamp } = await supabase
    .from('scavenger_stamps')
    .select('id, stamped_at')
    .eq('station_id', station.id)
    .eq('member_id', session.user.id)
    .maybeSingle()

  return (
    <ScanStampClient
      token={params.token}
      station={{ id: station.id, name: station.name, hint_text: station.hint_text, points_value: station.points_value }}
      hunt={{ id: hunt.id, title: hunt.title }}
      existingStamp={existingStamp ?? null}
    />
  )
}
