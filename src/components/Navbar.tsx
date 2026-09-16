'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-[#0a0a0a]/95 backdrop-blur-md border-b border-[#1f1f1f]' : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-foreground font-bold text-lg tracking-tight">
          NODE
        </Link>
        <div className="hidden md:flex items-center gap-8">
          {['About', 'Speakers', 'Schedule'].map((item) => (
            <Link
              key={item}
              href={`#${item.toLowerCase()}`}
              className="text-sm text-muted hover:text-foreground transition-colors"
            >
              {item}
            </Link>
          ))}
          <Link
            href="/leaderboard"
            className="text-sm text-muted hover:text-foreground transition-colors"
          >
            Leaderboard
          </Link>
        </div>
        <Link
          href="#tickets"
          className="text-sm px-4 py-2 border border-accent/40 text-accent rounded-full hover:bg-accent hover:text-[#0a0a0a] transition-all duration-200"
        >
          Buy tickets
        </Link>
      </div>
    </nav>
  )
}
