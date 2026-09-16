'use client'

import { createBrowserClient } from '@supabase/auth-helpers-nextjs'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'

interface Props {
  memberId: string
}

export default function NotificationBell({ memberId }: Props) {
  const [count, setCount] = useState(0)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    async function fetchCount() {
      const { count: c } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('member_id', memberId)
        .eq('is_read', false)
      setCount(c ?? 0)
    }

    fetchCount()

    const channel = supabase
      .channel(`notif-bell-${memberId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `member_id=eq.${memberId}` },
        () => { setCount((prev) => prev + 1) }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `member_id=eq.${memberId}` },
        () => { fetchCount() }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [memberId]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Button
      variant="ghost"
      size="sm"
      asChild
      className="relative text-muted-foreground hover:text-foreground"
    >
      <a
        href="/dashboard/notifications"
        aria-label={count > 0 ? `Notifications - ${count} unread` : 'Notifications'}
      >
        <span aria-hidden="true">🔔</span>
        {count > 0 && (
          <span
            aria-hidden="true"
            className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none"
          >
            {count > 9 ? '9+' : count}
          </span>
        )}
      </a>
    </Button>
  )
}
