'use client'
import { useEffect, useRef } from 'react'

const PILLARS = [
  { icon: '🎤', title: 'Live Talks', desc: 'Industry leaders sharing unfiltered insights from their journey — no slides, no fluff.' },
  { icon: '🎨', title: 'Design Jams', desc: 'Collaborative sessions where ideas collide, prototypes get built, and creativity flows.' },
  { icon: '🤝', title: 'Real Connections', desc: 'Meaningful networking without the awkward small talk. Just makers talking to makers.' },
]

export default function About() {
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add('visible') }),
      { threshold: 0.1 }
    )
    ref.current?.querySelectorAll('.animate-on-scroll').forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  return (
    <section id="about" ref={ref} className="py-32 px-6 md:px-16 lg:px-24 max-w-7xl mx-auto">
      <div className="animate-on-scroll">
        <p className="text-muted text-xs font-semibold tracking-widest uppercase mb-10">About</p>
        <h2 className="text-[clamp(2.2rem,7vw,5.5rem)] font-black leading-tight tracking-tighter text-foreground max-w-3xl mb-8">
          Creatives.<br />Conversations.<br />Connections.
        </h2>
        <p className="text-muted text-xl max-w-2xl leading-relaxed">
          This isn&apos;t your typical creative event. Think live talks, real connections, design jams,
          and no awkward networking.
        </p>
      </div>

      <div className="mt-20 grid md:grid-cols-3 gap-5 animate-on-scroll">
        {PILLARS.map(({ icon, title, desc }) => (
          <div
            key={title}
            className="border border-[#1f1f1f] rounded-2xl p-8 bg-[#111111]/30 hover:border-accent/20 hover:bg-[#111111]/60 transition-all duration-300"
          >
            <div className="text-3xl mb-5">{icon}</div>
            <h3 className="text-foreground font-semibold text-lg mb-3">{title}</h3>
            <p className="text-muted text-sm leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
