'use client'

import { createBrowserClient } from '@supabase/auth-helpers-nextjs'
import { useEffect, useRef, useState } from 'react'

interface Props { eventId: string }

const EMOJI_LIST = ['👏', '🔥', '❤️', '🚀', '💡', '😂', '👍', '🎉']

interface FloatingEmoji { id: number; emoji: string; x: number }

export default function EmojiReactions({ eventId }: Props) {
  const [floating, setFloating] = useState<FloatingEmoji[]>([])
  const [cooldown, setCooldown] = useState(false)
  const nextId = useRef(0)
  const containerRef = useRef<HTMLDivElement>(null)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    const channel = supabase
      .channel(`emoji:${eventId}`)
      .on('broadcast', { event: 'emoji' }, ({ payload }) => {
        spawnFloat(payload.emoji)
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [eventId])

  function spawnFloat(emoji: string) {
    const id = nextId.current++
    const x = 10 + Math.random() * 80
    setFloating(prev => [...prev, { id, emoji, x }])
    setTimeout(() => setFloating(prev => prev.filter(f => f.id !== id)), 2000)
  }

  async function handleReact(emoji: string) {
    if (cooldown) return
    setCooldown(true)
    spawnFloat(emoji)
    await fetch('/api/emoji/react', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_id: eventId, emoji }),
    })
    setTimeout(() => setCooldown(false), 800)
  }

  return (
    <div ref={containerRef} className="relative select-none">
      <style>{`
        @keyframes floatUp {
          0%   { transform: translateY(0) scale(1);   opacity: 1; }
          80%  { opacity: 1; }
          100% { transform: translateY(-80px) scale(1.3); opacity: 0; }
        }
        .emoji-float { animation: floatUp 1.8s ease-out forwards; pointer-events: none; }
      `}</style>

      <div className="pointer-events-none absolute bottom-full left-0 w-full h-20 overflow-hidden">
        {floating.map(f => (
          <span key={f.id} className="emoji-float absolute bottom-0 text-xl"
            style={{ left: `${f.x}%` }}>
            {f.emoji}
          </span>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {EMOJI_LIST.map(emoji => (
          <button
            key={emoji}
            onClick={() => handleReact(emoji)}
            disabled={cooldown}
            className="text-xl transition-transform hover:scale-125 active:scale-95 disabled:opacity-50 p-1 rounded-lg hover:bg-white/5"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  )
}
