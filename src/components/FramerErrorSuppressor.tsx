'use client'
import { useEffect } from 'react'

function isFramerError(msg: unknown): boolean {
  if (typeof msg !== 'string') return false
  return msg.includes('framerusercontent.com') ||
    msg.includes('Minified React error #42') ||
    msg.includes('server/client mismatch') ||
    msg.includes('Hydration failed') ||
    msg.includes('hydrating') ||
    msg.includes('did not match')
}

export function FramerErrorSuppressor() {
  useEffect(() => {
    // Suppress window error events from Framer bundle
    const errorHandler = (event: ErrorEvent) => {
      if (
        event.filename?.includes('framerusercontent.com') ||
        isFramerError(event.message)
      ) {
        event.preventDefault()
        event.stopImmediatePropagation()
      }
    }
    window.addEventListener('error', errorHandler, true)

    // Suppress console.error for React hydration mismatches from Framer
    const origConsoleError = console.error.bind(console)
    console.error = (...args: unknown[]) => {
      if (isFramerError(args[0]) || isFramerError(args[1])) return
      origConsoleError(...args)
    }

    // Suppress reportError (used by React 18 to trigger Next.js overlay)
    const origReportError = window.reportError?.bind(window)
    if (origReportError) {
      window.reportError = (err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err)
        if (isFramerError(msg)) return
        origReportError(err)
      }
    }

    return () => {
      window.removeEventListener('error', errorHandler, true)
      console.error = origConsoleError
      if (origReportError) window.reportError = origReportError
    }
  }, [])
  return null
}
