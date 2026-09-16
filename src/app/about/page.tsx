import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'About NODE - Northern Ontario Dev Exchange',
  description: 'NODE stands for Northern Ontario Dev Exchange, incorporated in Ontario as a not-for-profit (OCN 1001716490). nodesudbury.com is our sole official domain.',
}

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#0b0e14] text-[#c9d1e8] px-6 py-16">
      <div className="max-w-2xl mx-auto">
        <Link href="/" className="text-sm text-sky-400 hover:text-sky-300 mb-8 inline-block">
          &larr; Back to NODE Sudbury
        </Link>

        <h1 className="text-3xl font-bold text-white mb-2">About NODE</h1>
        <p className="text-sm text-[#5a6278] mb-10">Northern Ontario Dev Exchange</p>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-white mb-3">What is NODE?</h2>
          <p className="text-[#8892a4] leading-relaxed mb-4">
            NODE stands for <strong className="text-white">Northern Ontario Dev Exchange</strong> - a not-for-profit
            organization supporting careers in software development across Northern Ontario.
          </p>
          <p className="text-[#8892a4] leading-relaxed">
            The name combines our acronym (NODE) with Sudbury, our home city, to form our domain:
            <strong className="text-white"> nodesudbury.com</strong>. This is our sole and primary domain.
            All official email runs on <strong className="text-white">@nodesudbury.com</strong>.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-white mb-3">Legal Information</h2>
          <div className="bg-[#111520] rounded-lg p-5 border border-[#1e2535] space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-[#5a6278]">Legal name</span>
              <span className="text-white font-medium">Northern Ontario Dev Exchange</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[#5a6278]">Common name</span>
              <span className="text-white">NODE</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[#5a6278]">Jurisdiction</span>
              <span className="text-white">Province of Ontario, Canada</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[#5a6278]">Corporation type</span>
              <span className="text-white">Not-for-profit corporation</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[#5a6278]">Ontario Corporation Number</span>
              <span className="text-white font-mono">OCN 1001716490</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[#5a6278]">Incorporated</span>
              <span className="text-white">September 1, 2026</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[#5a6278]">Official domain</span>
              <span className="text-white">nodesudbury.com</span>
            </div>
          </div>
          <p className="text-[#5a6278] text-xs mt-3 leading-relaxed">
            nodesudbury.com is the official domain of Northern Ontario Dev Exchange, an Ontario not-for-profit corporation (OCN 1001716490).
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-white mb-3">Mission</h2>
          <p className="text-[#8892a4] leading-relaxed mb-4">
            NODE supports careers in software development in Northern Ontario through three pillars:
          </p>
          <ul className="space-y-3 text-[#8892a4] leading-relaxed">
            <li className="flex gap-3">
              <span className="text-sky-400 font-bold mt-0.5">01</span>
              <span><strong className="text-white">Professional growth</strong> - educational events, workshops, and hackathons</span>
            </li>
            <li className="flex gap-3">
              <span className="text-sky-400 font-bold mt-0.5">02</span>
              <span><strong className="text-white">Business attraction</strong> - promoting Northern Ontario&apos;s development community to attract investment</span>
            </li>
            <li className="flex gap-3">
              <span className="text-sky-400 font-bold mt-0.5">03</span>
              <span><strong className="text-white">Network facilitation</strong> - connecting developers, employers, and government</span>
            </li>
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-white mb-3">Contact</h2>
          <p className="text-[#8892a4] leading-relaxed">
            General inquiries:{' '}
            <a href="mailto:hannan@nodesudbury.com" className="text-sky-400 hover:text-sky-300 underline underline-offset-2">
              hannan@nodesudbury.com
            </a>
          </p>
          <p className="text-[#8892a4] leading-relaxed mt-2">
            73 Elm St Suite 203, Sudbury, ON P3C 1R6
          </p>
        </section>
      </div>
    </div>
  )
}
