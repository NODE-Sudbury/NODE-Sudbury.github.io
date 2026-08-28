'use client'
import { useEffect } from 'react'

export default function FramerMain() {
  useEffect(() => {
    if (document.querySelector('script[data-framer-main]')) return
    const el = document.createElement('script')
    el.type = 'module'
    el.src = '/script_main.mjs'
    el.setAttribute('data-framer-main', '1')
    document.body.appendChild(el)
  }, [])
  return null
}
