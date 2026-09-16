import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(_req: Request, { params }: { params: { eventId: string } }) {
  const { data: tracks } = await supabase
    .from('event_tracks')
    .select('id, name, color, sort_order')
    .eq('event_id', params.eventId)
    .order('sort_order')

  const { data: sessions } = await supabase
    .from('event_sessions')
    .select('id, track_id, title, description, session_type, speaker_name, speaker_bio, speaker_id, room, starts_at, ends_at')
    .eq('event_id', params.eventId)
    .order('starts_at')

  return NextResponse.json({ tracks: tracks ?? [], sessions: sessions ?? [] })
}
