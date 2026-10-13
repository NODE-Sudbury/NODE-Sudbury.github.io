'use client'
import Link from 'next/link'

const PERKS = [
  'Both conference days',
  'All talks & panels',
  'Lunch & coffee included',
  'Evening reception access',
]

export default function Tickets() {
  return (
    <section id="tickets" className="py-32 px-6 md:px-16 lg:px-24 max-w-7xl mx-auto">
      <div className="border border-[#1f1f1f] rounded-3xl overflow-hidden">
        <div className="p-10 md:p-16">
          <p className="text-muted text-xs font-semibold tracking-widest uppercase mb-5">Tickets</p>
          <h2 className="text-[clamp(2.2rem,7vw,5rem)] font-black tracking-tighter text-foreground mb-4">
            Ready to join us?
          </h2>
          <p className="text-muted text-lg mb-14 max-w-xl leading-relaxed">
            Sudbury, ON. Fall 2026.
            Two days of talks, workshops, and real connections.
          </p>

          <div className="grid md:grid-cols-2 gap-5 mb-12">
            {[
              {
                tier: 'Early Bird',
                price: '€199',
                desc: 'Limited spots available. Grab yours before they sell out.',
                badge: 'Selling fast',
                badgeClass: 'bg-accent/15 text-accent',
                highlight: true,
              },
              {
                tier: 'Regular',
                price: '€299',
                desc: 'Full access to both days, all sessions, and the evening reception.',
                badge: 'Available',
                badgeClass: 'bg-green-500/15 text-green-400',
                highlight: false,
              },
            ].map(({ tier, price, desc, badge, badgeClass, highlight }) => (
              <div
                key={tier}
                className={`rounded-2xl p-8 border transition-colors ${
                  highlight
                    ? 'border-accent/30 bg-accent/5'
                    : 'border-[#1f1f1f] bg-[#111111]/20'
                }`}
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-foreground font-bold text-lg">{tier}</h3>
                  <span className={`text-xs px-3 py-1 rounded-full font-medium ${badgeClass}`}>
                    {badge}
                  </span>
                </div>
                <p className="text-[clamp(2.5rem,6vw,3.5rem)] font-black text-foreground tracking-tighter leading-none mb-3">
                  {price}
                </p>
                <p className="text-muted text-sm mb-6 leading-relaxed">{desc}</p>
                <ul className="space-y-2.5">
                  {PERKS.map((perk) => (
                    <li key={perk} className="flex items-center gap-2.5 text-sm text-muted">
                      <svg className="w-4 h-4 text-accent shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {perk}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <Link
            href="#"
            className="inline-flex items-center gap-2.5 bg-accent text-[#0a0a0a] font-bold px-10 py-5 rounded-full text-base hover:bg-accent/90 transition-all duration-200 hover:scale-105 active:scale-95"
          >
            Buy tickets
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  )
}
