'use client'
import { useEffect, useRef } from 'react'

const SPEAKERS = [
  { name: 'TBD', title: 'President', initials: '?', color: '#8B5CF6' },
  { name: 'TBD', title: 'Secretary', initials: '?', color: '#EC4899' },
  { name: 'TBD', title: 'Treasurer', initials: '?', color: '#F59E0B' },
  { name: 'TBD', title: 'Marketing', initials: '?', color: '#10B981' },
  { name: 'TBD', title: 'Promotion/Sponsorship', initials: '?', color: '#3B82F6' },
  { name: 'TBD', title: 'Technical Communicator', initials: '?', color: '#EF4444' },
  { name: 'TBD', title: 'Events Coordinator', initials: '?', color: '#14B8A6' },
  { name: 'TBD', title: 'Membership Leader', initials: '?', color: '#F97316' },
]

export default function Speakers() {
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add('visible') }),
      { threshold: 0.05 }
    )
    ref.current?.querySelectorAll('.animate-on-scroll').forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  return (
    <section id="speakers" ref={ref} className="py-32 px-6 md:px-16 lg:px-24 max-w-7xl mx-auto">
      <div className="animate-on-scroll mb-16">
        <p className="text-muted text-xs font-semibold tracking-widest uppercase mb-4">Speakers</p>
        <h2 className="text-[clamp(2rem,6vw,4.5rem)] font-black tracking-tighter text-foreground mb-5">
          Let the pros do the talking
        </h2>
        <p className="text-muted text-lg max-w-xl leading-relaxed">
          Learn from indie founders, digital artists, and product designers at the top of their game.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {SPEAKERS.map((s, i) => (
          <div
            key={s.name}
            className="animate-on-scroll group border border-[#1f1f1f] rounded-2xl p-6 bg-[#111111]/20 hover:border-accent/20 hover:bg-[#111111]/60 transition-all duration-300 cursor-default"
            style={{ transitionDelay: `${i * 40}ms` }}
          >
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-sm mb-4"
              style={{ backgroundColor: s.color }}
            >
              {s.initials}
            </div>
            <h3 className="text-foreground font-semibold text-sm mb-1 leading-tight">{s.name}</h3>
            <p className="text-muted text-xs leading-relaxed">{s.title}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
