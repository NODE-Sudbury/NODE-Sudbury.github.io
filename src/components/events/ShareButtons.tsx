'use client'

import { useState } from 'react'

interface ShareButtonsProps {
  title: string
  url: string
  referralId?: string
}

export function ShareButtons({ title, url, referralId }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false)
  const [copiedRef, setCopiedRef] = useState(false)

  const refUrl = referralId ? `${url}?ref=${referralId}` : url
  const encoded = encodeURIComponent(refUrl)
  const text = encodeURIComponent(`Check out ${title} at NODE Sudbury!`)

  const handleCopy = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title, url: refUrl })
      } else {
        await navigator.clipboard.writeText(refUrl)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
    } catch {
      // user cancelled share or clipboard blocked
    }
  }

  const handleCopyRef = async () => {
    try {
      await navigator.clipboard.writeText(refUrl)
      setCopiedRef(true)
      setTimeout(() => setCopiedRef(false), 2000)
    } catch {
      // clipboard blocked
    }
  }

  const btnCls = 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border border-[#252b3a] bg-[#13161f] text-[#5a6278] hover:text-[#c9d1e8] hover:border-[#38bdf8]/30 transition-colors'

  return (
    <div className="flex flex-wrap items-center gap-2 my-4">
      <span className="text-xs text-[#3a3f52] mr-0.5">Share:</span>

      {/* X / Twitter */}
      <a
        href={`https://twitter.com/intent/tweet?text=${text}&url=${encoded}`}
        target="_blank"
        rel="noopener noreferrer"
        className={btnCls}
        aria-label="Share on X"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.261 5.636 5.903-5.636zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
        </svg>
        X
      </a>

      {/* LinkedIn */}
      <a
        href={`https://www.linkedin.com/sharing/share-offsite/?url=${encoded}`}
        target="_blank"
        rel="noopener noreferrer"
        className={btnCls}
        aria-label="Share on LinkedIn"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
        </svg>
        LinkedIn
      </a>

      {/* Copy link */}
      <button onClick={handleCopy} className={btnCls} aria-label="Copy link">
        {copied ? (
          <>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Copied!
          </>
        ) : (
          <>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="9" y="9" width="13" height="13" rx="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
            Copy Link
          </>
        )}
      </button>

      {referralId && (
        <button onClick={handleCopyRef} className={btnCls} aria-label="Copy referral link">
          {copiedRef ? (
            <>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Copied!
            </>
          ) : (
            <>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
              Copy Referral Link
            </>
          )}
        </button>
      )}
    </div>
  )
}
