'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

type RegStatus = 'confirmed' | 'waitlisted' | 'cancelled' | 'attended' | 'no_show' | 'pending_consent' | 'pending_payment'
type FilterOption = 'confirmed' | 'waitlisted' | 'cancelled' | 'attended' | 'no_show' | 'pending' | 'all'

interface Props { supabase: any; memberId: string }

const STATUS_VARIANT: Record<RegStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  confirmed:       'default',
  waitlisted:      'secondary',
  cancelled:       'destructive',
  attended:        'outline',
  no_show:         'outline',
  pending_consent: 'outline',
  pending_payment: 'outline',
}

const STATUS_LABEL: Record<RegStatus, string> = {
  confirmed:       'Confirmed',
  waitlisted:      'Waitlisted',
  cancelled:       'Cancelled',
  attended:        'Attended',
  no_show:         'No show',
  pending_consent: 'Pending consent',
  pending_payment: 'Pending payment',
}

export function MyRSVPs({ supabase, memberId }: Props) {
  const [regs, setRegs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterOption>('confirmed')

  useEffect(() => {
    if (!memberId) return
    supabase
      .from('registrations')
      .select('*, event:events(title, slug, starts_at, ends_at, status), ticket:ticket_types(name, pricing_model, price_cents)')
      .eq('member_id', memberId)
      .order('created_at', { ascending: false })
      .then(({ data }: any) => { setRegs(data ?? []); setLoading(false) })
  }, [memberId])

  const isPending = (s: string) => s === 'pending_consent' || s === 'pending_payment'

  const counts = {
    confirmed: regs.filter((r) => r.status === 'confirmed').length,
    waitlisted: regs.filter((r) => r.status === 'waitlisted').length,
    cancelled:  regs.filter((r) => r.status === 'cancelled').length,
    attended:   regs.filter((r) => r.status === 'attended').length,
    no_show:    regs.filter((r) => r.status === 'no_show').length,
    pending:    regs.filter((r) => isPending(r.status)).length,
  }

  const filtered = filter === 'all'
    ? regs
    : filter === 'pending'
    ? regs.filter((r) => isPending(r.status))
    : regs.filter((r) => r.status === filter)

  async function cancelReg(regId: string) {
    await supabase.from('registrations').update({ status: 'cancelled' }).eq('id', regId)
    setRegs((prev) => prev.map((r) => r.id === regId ? { ...r, status: 'cancelled' } : r))
  }

  if (loading) return <p className="text-sm text-muted-foreground">Loading registrations...</p>

  const pills: { key: FilterOption; label: string }[] = [
    { key: 'confirmed', label: 'Confirmed' },
    { key: 'waitlisted', label: 'Waitlisted' },
    { key: 'attended', label: 'Attended' },
    { key: 'pending', label: 'Pending' },
    { key: 'cancelled', label: 'Cancelled' },
    { key: 'all', label: 'All' },
  ]

  return (
    <div className="space-y-4">
      {/* Filter pills */}
      <div className="flex gap-2 flex-wrap">
        {pills.map(({ key, label }) => (
          <Button
            key={key}
            variant={filter === key ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setFilter(key)}
          >
            {label}
            {key !== 'all' && (
              <span className="ml-1.5 text-xs text-muted-foreground">
                ({counts[key as keyof typeof counts] ?? 0})
              </span>
            )}
          </Button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-10">
          {filter === 'all' ? "You haven't registered for any events yet." : `No ${filter} registrations.`}
        </p>
      ) : (
        <div className="space-y-3">
          {filtered.map((reg) => {
            const event = reg.event
            const ticket = reg.ticket
            const isPast = event?.starts_at ? new Date(event.starts_at) < new Date() : false
            const status = reg.status as RegStatus
            const canCancel = status === 'confirmed' && !isPast && event?.status !== 'cancelled'

            return (
              <Card key={reg.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{event?.title ?? 'Unknown event'}</p>
                      {ticket?.name && (
                        <p className="text-xs text-muted-foreground mt-0.5">{ticket.name}</p>
                      )}
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
                      <Badge
                        variant={STATUS_VARIANT[status]}
                        className={`capitalize ${status === 'attended' ? 'text-green-400 border-green-400/40' : ''}`}
                      >
                        {STATUS_LABEL[status]}
                      </Badge>
                      {status === 'waitlisted' && reg.waitlist_position && (
                        <span className="text-xs text-muted-foreground">#{reg.waitlist_position} in queue</span>
                      )}
                    </div>
                  </div>

                  {reg.checked_in_at && (
                    <>
                      <Separator className="my-3" />
                      <p className="text-xs text-green-400">
                        Checked in at {new Date(reg.checked_in_at).toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </>
                  )}

                  {canCancel && (
                    <>
                      <Separator className="my-3" />
                      <Button variant="destructive" size="sm" onClick={() => cancelReg(reg.id)}>
                        Cancel registration
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
