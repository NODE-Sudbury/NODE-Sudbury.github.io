'use client'
import Link from 'next/link'

const TICKER = ['Join us in Sudbury, ON', 'Free membership for students', 'Open to everyone who builds']

export default function Hero() {
  return (
    <section className="relative min-h-screen bg-[#0a0a0a] flex flex-col overflow-hidden">
      {/* Scrolling ticker */}
      <div className="mt-[72px] border-y border-[#1f1f1f] py-2.5 overflow-hidden bg-[#111111]/60">
        <div
          className="flex whitespace-nowrap"
          style={{ animation: 'marquee 24s linear infinite' }}
        >
          {[0, 1, 2].map((i) => (
            <span key={i} className="flex items-center gap-6 pr-6 text-accent text-sm font-medium">
              {TICKER.map((t, j) => (
                <span key={j} className="flex items-center gap-6">
                  <span>{t}</span>
                  <span className="text-[#1f1f1f]">·</span>
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col justify-center px-6 md:px-16 lg:px-24 max-w-7xl mx-auto w-full py-20">
        <div style={{ animation: 'fadeUp 0.8s ease-out 0.1s both' }}>
          <p className="text-muted text-xs font-semibold tracking-widest uppercase mb-8">
            Sudbury, ON &nbsp;·&nbsp; Fall 2026
          </p>
          <h1 className="text-[clamp(3.5rem,13vw,11rem)] font-black leading-[0.88] tracking-tighter text-foreground mb-6">
            An event<br />
            for{' '}
            <span className="text-accent italic">makers</span>
          </h1>
          <p className="text-muted text-lg md:text-xl max-w-xl leading-relaxed">
            Builders, developers, and makers from Northern Ontario.
          </p>
        </div>

        {/* Info cards */}
        <div
          className="mt-14 flex flex-wrap gap-3"
          style={{ animation: 'fadeUp 0.8s ease-out 0.3s both' }}
        >
          {[
            { label: 'Date', value: '1 Jul – 2 Jul, 2026' },
            { label: 'Time', value: '09:00 – 21:00' },
            { label: 'Venue', value: 'NODE HQ' },
            { label: 'Address', value: '73 Elm St Ste 203' },
          ].map(({ label, value }) => (
            <div key={label} className="border border-[#1f1f1f] rounded-xl px-5 py-4 bg-[#111111]/50">
              <p className="text-muted text-[10px] mb-1 uppercase tracking-widest font-medium">{label}</p>
              <p className="text-foreground text-sm font-medium">{value}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div style={{ animation: 'fadeUp 0.8s ease-out 0.5s both' }} className="mt-10">
          <Link
            href="#tickets"
            className="inline-flex items-center gap-2 bg-accent text-[#0a0a0a] font-bold px-8 py-4 rounded-full text-sm hover:bg-accent/90 transition-all duration-200 hover:scale-105 active:scale-95"
          >
            Buy tickets
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
      </div>

      {/* Bottom gradient */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#0a0a0a] to-transparent pointer-events-none" />
    </section>
  )
}
