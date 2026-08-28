'use client'
import { useState } from 'react'

type EventType = 'talk' | 'panel' | 'break' | 'logistics' | 'intro'

interface ScheduleItem {
  time: string
  end?: string
  type: EventType
  title: string
  subtitle?: string
  desc: string
  speakers: string[]
}

const DAY1: ScheduleItem[] = [
  { time: '09:00', end: '09:30', type: 'logistics', title: 'Doors Open', desc: 'Grab your badge, meet a few early birds, and enjoy fresh coffee from our local partner roasters.', speakers: [] },
  { time: '09:30', end: '09:45', type: 'intro', title: 'Welcome', subtitle: 'Introduction', desc: "We'll kick things off with a quick intro, some creative energy, and a preview of what's ahead.", speakers: [] },
  { time: '10:30', end: '11:15', type: 'talk', title: 'Design in the Age of AI', subtitle: 'Talk', desc: 'A look into how artificial intelligence is reshaping creativity, and what it means for human designers.', speakers: ['Ava Morales', 'Omar Kalidi', 'Nova Renfield'] },
  { time: '11:15', end: '12:00', type: 'talk', title: 'Pixels with Personality: Designing for Emotion', subtitle: 'Talk', desc: 'How to move beyond clean UI into creating memorable, emotionally resonant digital experiences.', speakers: ['Remy Jacobs', 'Juniper Walsh'] },
  { time: '12:00', end: '13:00', type: 'break', title: 'Lunch Break', desc: 'Recharge with lunch provided by our local food partners.', speakers: [] },
  { time: '13:00', end: '14:00', type: 'panel', title: 'From Side Project to Studio', subtitle: 'Panel Discussion', desc: 'Real stories from independent creators who turned passion projects into thriving studios.', speakers: ['Felix Strom', 'Lotte Swaan', 'Elias Mendez'] },
  { time: '14:30', end: '15:30', type: 'talk', title: 'Typography as Identity', subtitle: 'Talk', desc: 'How letterforms carry culture, personality, and meaning — and how to wield them with intention.', speakers: ['Hana Okabe'] },
  { time: '16:00', end: '17:00', type: 'panel', title: 'Tools We Love (And Hate)', subtitle: 'Roundtable', desc: 'Opinionated takes on the design tools shaping 2026 — the good, the broken, and the underrated.', speakers: ['Felix Strom', 'Nova Renfield', 'Elias Mendez'] },
  { time: '19:00', end: '21:00', type: 'logistics', title: 'Evening Reception', desc: 'Wind down with drinks, good company, and the kind of conversations that keep you up too late.', speakers: [] },
]

const DAY2: ScheduleItem[] = [
  { time: '09:00', end: '09:30', type: 'logistics', title: 'Doors Open', desc: 'Day 2 kicks off. Find your seat, grab coffee, and pick up where yesterday left off.', speakers: [] },
  { time: '10:00', end: '11:30', type: 'talk', title: 'Building with Cursor in 2026', subtitle: 'Live Workshop', desc: 'A hands-on session — from blank canvas to shipped product in 90 minutes. Bring your laptop.', speakers: ['Felix Strom'] },
  { time: '12:00', end: '13:00', type: 'panel', title: 'The Future of Design Tools', subtitle: 'Panel Discussion', desc: 'Where are design tools headed? Our panelists debate what the next wave looks like.', speakers: ['Hana Okabe', 'Nova Renfield', 'Omar Kalidi'] },
  { time: '13:00', end: '14:00', type: 'break', title: 'Lunch Break', desc: 'Final lunch together — the perfect time for one last conversation.', speakers: [] },
  { time: '14:00', end: '15:30', type: 'talk', title: 'Making Things That Matter', subtitle: 'Talk', desc: 'A manifesto for makers. A celebration of everything built. A challenge for what comes next.', speakers: ['Ava Morales', 'Remy Jacobs'] },
  { time: '16:00', end: '17:00', type: 'logistics', title: 'Closing Ceremony', desc: "It's not goodbye — it's see you at the next one. Wrap up, last connections, safe travels.", speakers: [] },
]

const TYPE_CARD: Record<EventType, string> = {
  talk: 'border-accent/25 bg-accent/5',
  panel: 'border-blue-500/25 bg-blue-500/5',
  break: 'border-[#1f1f1f]/60 bg-transparent opacity-60',
  logistics: 'border-[#1f1f1f]/60 bg-transparent opacity-70',
  intro: 'border-[#1f1f1f] bg-[#111111]/20',
}

const TYPE_BADGE: Record<EventType, string> = {
  talk: 'bg-accent/15 text-accent',
  panel: 'bg-blue-500/15 text-blue-400',
  break: 'hidden',
  logistics: 'hidden',
  intro: 'bg-[#1f1f1f] text-muted',
}

export default function Schedule() {
  const [activeDay, setActiveDay] = useState(0)
  const days = [DAY1, DAY2]

  return (
    <section id="schedule" className="py-32 px-6 md:px-16 lg:px-24 max-w-7xl mx-auto">
      <div className="mb-16">
        <p className="text-muted text-xs font-semibold tracking-widest uppercase mb-4">Schedule</p>
        <h2 className="text-[clamp(2rem,6vw,4.5rem)] font-black tracking-tighter text-foreground mb-4">
          Two days. Dozens of insights.
        </h2>
        <p className="text-muted text-lg max-w-xl">One shared mission: make things that matter.</p>
      </div>

      <div className="flex gap-2 mb-10">
        {['Day 1', 'Day 2'].map((label, i) => (
          <button
            key={i}
            onClick={() => setActiveDay(i)}
            className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-200 ${
              activeDay === i
                ? 'bg-foreground text-[#0a0a0a]'
                : 'border border-[#1f1f1f] text-muted hover:text-foreground'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="space-y-2.5">
        {days[activeDay].map((item, i) => (
          <div
            key={i}
            className={`border rounded-2xl p-6 transition-all duration-200 ${TYPE_CARD[item.type]}`}
          >
            <div className="flex flex-col sm:flex-row sm:items-start gap-4">
              <div className="sm:w-24 shrink-0">
                <p className="text-foreground font-mono text-sm font-medium tabular-nums">{item.time}</p>
                {item.end && <p className="text-muted font-mono text-xs tabular-nums">{item.end}</p>}
              </div>
              <div className="flex-1 min-w-0">
                {item.subtitle && (
                  <span className={`inline-block text-xs px-2.5 py-0.5 rounded-full font-medium mb-2 ${TYPE_BADGE[item.type]}`}>
                    {item.subtitle}
                  </span>
                )}
                <h3 className="text-foreground font-semibold mb-1.5 leading-snug">{item.title}</h3>
                {item.desc && (
                  <p className="text-muted text-sm leading-relaxed mb-3">{item.desc}</p>
                )}
                {item.speakers.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {item.speakers.map((s) => (
                      <span key={s} className="text-xs px-3 py-1 border border-[#1f1f1f] rounded-full text-muted">
                        {s}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
