import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Accessibility Statement',
  description: 'NODE Sudbury commitment to digital accessibility for all users.',
}

export default function AccessibilityPage() {
  return (
    <div className="min-h-screen bg-[#0b0e14] text-[#c9d1e8] px-6 py-16">
      <div className="max-w-2xl mx-auto">
        <Link href="/" className="text-sm text-sky-400 hover:text-sky-300 mb-8 inline-block">
          &larr; Back to NODE Sudbury
        </Link>

        <h1 className="text-3xl font-bold text-white mb-2">Accessibility Statement</h1>
        <p className="text-sm text-[#5a6278] mb-10">Last reviewed: August 2026</p>

        <section aria-labelledby="commitment-heading" className="mb-8">
          <h2 id="commitment-heading" className="text-xl font-semibold text-white mb-3">Our Commitment</h2>
          <p className="text-[#8892a4] leading-relaxed">
            NODE Sudbury is committed to ensuring digital accessibility for people with disabilities.
            We aim to conform to the Web Content Accessibility Guidelines (WCAG) 2.1 Level AA standard
            and continually improve the user experience for everyone.
          </p>
        </section>

        <section aria-labelledby="measures-heading" className="mb-8">
          <h2 id="measures-heading" className="text-xl font-semibold text-white mb-3">Measures We Take</h2>
          <ul className="space-y-2 text-[#8892a4] leading-relaxed list-disc list-inside">
            <li>Keyboard navigation support throughout the platform</li>
            <li>Visible focus indicators for keyboard users</li>
            <li>ARIA labels and semantic HTML for screen reader compatibility</li>
            <li>Sufficient colour contrast ratios (minimum 4.5:1 for normal text)</li>
            <li>Respect for the operating system&apos;s reduced motion preference</li>
            <li>Skip-to-content link for keyboard and screen reader users</li>
            <li>Descriptive link text and button labels</li>
          </ul>
        </section>

        <section aria-labelledby="limitations-heading" className="mb-8">
          <h2 id="limitations-heading" className="text-xl font-semibold text-white mb-3">Known Limitations</h2>
          <p className="text-[#8892a4] leading-relaxed mb-3">
            We are aware of the following areas that may not fully meet accessibility standards:
          </p>
          <ul className="space-y-2 text-[#8892a4] leading-relaxed list-disc list-inside">
            <li>Some third-party embedded content (maps, video players) may not be fully accessible</li>
            <li>The collaborative whiteboard canvas does not currently support screen readers</li>
            <li>Complex data visualisations in the analytics dashboard may lack sufficient text alternatives</li>
          </ul>
          <p className="text-[#8892a4] leading-relaxed mt-3">
            We are actively working to address these limitations.
          </p>
        </section>

        <section aria-labelledby="contact-heading" className="mb-8">
          <h2 id="contact-heading" className="text-xl font-semibold text-white mb-3">Feedback & Contact</h2>
          <p className="text-[#8892a4] leading-relaxed">
            If you experience accessibility barriers or have suggestions for improvement, please contact us:
          </p>
          <p className="mt-3">
            <a
              href="mailto:accessibility@nodesudbury.com"
              className="text-sky-400 hover:text-sky-300 underline underline-offset-2"
            >
              accessibility@nodesudbury.com
            </a>
          </p>
          <p className="text-[#8892a4] leading-relaxed mt-3">
            We aim to respond to accessibility feedback within 5 business days.
          </p>
        </section>

        <section aria-labelledby="standard-heading">
          <h2 id="standard-heading" className="text-xl font-semibold text-white mb-3">Technical Specification</h2>
          <p className="text-[#8892a4] leading-relaxed">
            This website relies on the following technologies for conformance with WCAG 2.1: HTML, CSS,
            JavaScript, WAI-ARIA. These technologies are relied upon for conformance.
          </p>
        </section>
      </div>
    </div>
  )
}
