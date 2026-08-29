'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

type RSVPStatus = 'confirmed' | 'waitlisted' | 'cancelled'
interface Props { supabase: any; memberId: string }

const STATUS_VARIANT: Record<RSVPStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  confirmed: 'default',
  waitlisted: 'secondary',
  cancelled: 'destructive',
}

export function MyRSVPs({ supabase, memberId }: Props) {
  const [rsvps, setRsvps] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<RSVPStatus | 'all'>('confirmed')

  useEffect(() => {
    if (!memberId) return
    supabase
      .from('rsvps')
      .select('*, event:events(title, slug, starts_at, ends_at, is_cancelled)')
      .eq('member_id', memberId)
      .order('created_at', { ascending: false })
      .then(({ data }: any) => { setRsvps(data ?? []); setLoading(false) })
  }, [memberId])

  const counts = {
    confirmed: rsvps.filter((r) => r.status === 'confirmed').length,
    waitlisted: rsvps.filter((r) => r.status === 'waitlisted').length,
    cancelled: rsvps.filter((r) => r.status === 'cancelled').length,
  }

  const filtered = filter === 'all' ? rsvps : rsvps.filter((r) => r.status === filter)

  async function cancelRSVP(rsvpId: string) {
    await supabase.from('rsvps').update({ status: 'cancelled' }).eq('id', rsvpId)
    setRsvps((prev) => prev.map((r) => r.id === rsvpId ? { ...r, status: 'cancelled' } : r))
  }

  if (loading) return <p className="text-sm text-muted-foreground">Loading RSVPs...</p>

  return (
    <div className="space-y-4">
      {/* Filter pills */}
      <div className="flex gap-2 flex-wrap">
        {(['confirmed', 'waitlisted', 'cancelled', 'all'] as const).map((f) => (
          <Button
            key={f}
            variant={filter === f ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setFilter(f)}
            className="capitalize"
          >
            {f === 'all' ? 'All' : f}
            {f !== 'all' && (
              <span className="ml-1.5 text-xs text-muted-foreground">({counts[f]})</span>
            )}
          </Button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-10">
          {filter === 'all' ? "You haven't RSVP'd to any events yet." : `No ${filter} RSVPs.`}
        </p>
      ) : (
        <div className="space-y-3">
          {filtered.map((rsvp) => {
            const event = rsvp.event
            const isPast = event?.starts_at ? new Date(event.starts_at) < new Date() : false
            return (
              <Card key={rsvp.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{event?.title ?? 'Unknown event'}</p>
                      {event?.starts_at && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(event.starts_at).toLocaleDateString('en-CA', {
                            weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
                          })}
                          {' · '}
                          {new Date(event.starts_at).toLocaleTimeString('en-CA', {
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <Badge variant={STATUS_VARIANT[rsvp.status as RSVPStatus]} className="capitalize">
                        {rsvp.status}
                      </Badge>
                      {rsvp.status === 'waitlisted' && rsvp.waitlist_position && (
                        <span className="text-xs text-muted-foreground">#{rsvp.waitlist_position} in queue</span>
                      )}
                    </div>
                  </div>

                  {rsvp.checked_in_at && (
                    <>
                      <Separator className="my-3" />
                      <p className="text-xs text-green-400">
                        Checked in at {new Date(rsvp.checked_in_at).toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </>
                  )}

                  {rsvp.status === 'confirmed' && !isPast && !event?.is_cancelled && (
                    <>
                      <Separator className="my-3" />
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => cancelRSVP(rsvp.id)}
                      >
                        Cancel RSVP
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
