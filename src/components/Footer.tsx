import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="border-t border-[#1f1f1f] py-16 px-6 md:px-16 lg:px-24 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between gap-12">
        <div className="max-w-xs">
          <p className="text-foreground font-bold text-xl mb-2 tracking-tight">NODE</p>
          <p className="text-muted text-sm leading-relaxed">
            Northern Ontario Dev Exchange. Sudbury, ON.
          </p>
        </div>
        <div className="flex flex-wrap gap-x-16 gap-y-8">
          <div className="space-y-3">
            <p className="text-foreground text-xs font-semibold uppercase tracking-widest">Event</p>
            {['About', 'Speakers', 'Schedule', 'Tickets'].map((l) => (
              <Link key={l} href={`#${l.toLowerCase()}`} className="block text-muted text-sm hover:text-foreground transition-colors">
                {l}
              </Link>
            ))}
          </div>
          <div className="space-y-3">
            <p className="text-foreground text-xs font-semibold uppercase tracking-widest">Social</p>
            {[
              { name: 'Twitter / X', href: '#' },
              { name: 'Instagram', href: '#' },
              { name: 'LinkedIn', href: '#' },
            ].map((s) => (
              <Link key={s.name} href={s.href} className="block text-muted text-sm hover:text-foreground transition-colors">
                {s.name}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-14 pt-8 border-t border-[#1f1f1f] flex flex-col sm:flex-row justify-between gap-4 text-muted text-xs">
        <p>© 2026 NODE - Northern Ontario Dev Exchange. All rights reserved.</p>
        <div className="flex gap-6">
          <Link href="#" className="hover:text-foreground transition-colors">Privacy Policy</Link>
          <Link href="#" className="hover:text-foreground transition-colors">Terms</Link>
          <Link href="/accessibility" className="hover:text-foreground transition-colors">Accessibility</Link>
        </div>
      </div>
    </footer>
  )
}
