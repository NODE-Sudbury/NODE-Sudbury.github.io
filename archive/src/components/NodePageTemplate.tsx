/**
 * NODE PAGE TEMPLATE
 * ------------------
 * Copy this to src/app/[page-name]/page.tsx to create any new page
 * that matches the NODE site design system exactly.
 *
 * See src/archive/UI_SYSTEM.md for the full design reference.
 * See src/archive/CONTENT_STRATEGY.md for content guidelines.
 * See src/archive/preserved_sections.html for reusable sections.
 */

'use client'
import { useEffect, useRef } from 'react'
import Link from 'next/link'
import Navbar from './Navbar'
import Footer from './Footer'

// ─── Reusable primitives ────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-muted text-xs font-semibold tracking-widest uppercase mb-5">
      {children}
    </p>
  )
}

function Heading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[clamp(2rem,6vw,4.5rem)] font-black tracking-tighter text-foreground mb-5 leading-tight">
      {children}
    </h2>
  )
}

function Card({ tag, title, desc }: { tag?: string; title: string; desc: string }) {
  return (
    <div className="border border-border rounded-2xl p-8 bg-surface/30 hover:border-accent/20 hover:bg-surface/60 transition-all duration-300">
      {tag && (
        <span className="inline-block text-xs px-2.5 py-0.5 rounded-full bg-accent/15 text-accent mb-4 font-medium">
          {tag}
        </span>
      )}
      <h3 className="text-foreground font-semibold text-lg mb-3 leading-snug">{title}</h3>
      <p className="text-muted text-sm leading-relaxed">{desc}</p>
    </div>
  )
}

function PrimaryButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 bg-accent text-bg font-bold px-8 py-4 rounded-full text-sm hover:bg-accent/90 transition-all duration-200 hover:scale-105 active:scale-95"
    >
      {children}
    </Link>
  )
}

function OutlineButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 border border-accent/40 text-accent px-6 py-3 rounded-full text-sm hover:bg-accent hover:text-bg transition-all duration-200"
    >
      {children}
    </Link>
  )
}

function Divider() {
  return <div className="border-t border-border my-20" />
}

// ─── Scroll reveal hook ──────────────────────────────────────────────────────

function useScrollReveal(ref: React.RefObject<HTMLElement>) {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add('visible') }),
      { threshold: 0.1 }
    )
    ref.current?.querySelectorAll('.animate-on-scroll').forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function NodeTemplatePage() {
  const ref = useRef<HTMLElement>(null)
  useScrollReveal(ref)

  return (
    <main ref={ref} className="bg-bg min-h-screen">
      <Navbar />

      {/* HERO ─────────────────────────────────────────────────────────────── */}
      <section className="min-h-[65vh] flex flex-col justify-center px-6 md:px-16 lg:px-24 max-w-7xl mx-auto pt-36 pb-24">
        <div className="animate-on-scroll">
          <Label>Page Label</Label>
          <h1 className="text-[clamp(3rem,10vw,8rem)] font-black tracking-tighter text-foreground leading-[0.9] mb-8">
            Page<br />
            <span className="text-accent">Headline</span>
          </h1>
          <p className="text-muted text-xl max-w-2xl leading-relaxed mb-10">
            Supporting description. Keep it short, direct, and benefit-focused.
          </p>
          <div className="flex flex-wrap gap-3">
            <PrimaryButton href="#section">Primary CTA</PrimaryButton>
            <OutlineButton href="#learn-more">Learn more</OutlineButton>
          </div>
        </div>
      </section>

      <Divider />

      {/* CARDS GRID ───────────────────────────────────────────────────────── */}
      <section className="py-24 px-6 md:px-16 lg:px-24 max-w-7xl mx-auto">
        <div className="animate-on-scroll mb-14">
          <Label>Section</Label>
          <Heading>Section Heading</Heading>
          <p className="text-muted text-lg max-w-xl leading-relaxed">
            Supporting text for this section. One or two sentences max.
          </p>
        </div>
        <div className="animate-on-scroll grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          <Card tag="Type" title="Card One" desc="Short, punchy description of this item or feature." />
          <Card tag="Type" title="Card Two" desc="Short, punchy description of this item or feature." />
          <Card tag="Type" title="Card Three" desc="Short, punchy description of this item or feature." />
        </div>
      </section>

      <Divider />

      {/* LIST / TABLE SECTION ─────────────────────────────────────────────── */}
      <section className="py-24 px-6 md:px-16 lg:px-24 max-w-7xl mx-auto">
        <div className="animate-on-scroll mb-14">
          <Label>Details</Label>
          <Heading>List or Table Section</Heading>
        </div>
        <div className="animate-on-scroll space-y-2.5">
          {['Item one', 'Item two', 'Item three', 'Item four'].map((item) => (
            <div key={item} className="border border-border rounded-2xl px-6 py-5 flex items-center justify-between hover:border-accent/20 transition-colors">
              <span className="text-foreground font-medium">{item}</span>
              <span className="text-muted text-sm">Detail</span>
            </div>
          ))}
        </div>
      </section>

      <Divider />

      {/* CTA BANNER ───────────────────────────────────────────────────────── */}
      <section className="py-24 px-6 md:px-16 lg:px-24 max-w-7xl mx-auto">
        <div className="border border-border rounded-3xl p-12 md:p-16 animate-on-scroll">
          <Label>Get Involved</Label>
          <Heading>Ready to join?</Heading>
          <p className="text-muted text-lg mb-10 max-w-xl leading-relaxed">
            Become a NODE member and connect with Northern Ontario&apos;s growing developer community.
          </p>
          <PrimaryButton href="/membership">Join NODE</PrimaryButton>
        </div>
      </section>

      <Footer />
    </main>
  )
}

/**
 * USAGE NOTES
 * -----------
 * 1. Rename this file to page.tsx in your new route folder
 * 2. Update the page title in src/app/layout.tsx metadata (or add a local export const metadata)
 * 3. Replace all placeholder text with real content from CONTENT_STRATEGY.md
 * 4. To reuse a section from the original template:
 *    - Open src/archive/preserved_sections.html and find the section
 *    - Copy that HTML into a dangerouslySetInnerHTML div
 *    - Make sure layout.tsx imports framer.css (it already does)
 */
