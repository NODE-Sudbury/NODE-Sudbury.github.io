import type { Metadata } from 'next'
import Script from 'next/script'
import './globals.css'
import './framer.css'
import { FramerErrorSuppressor } from '../components/FramerErrorSuppressor'

export const metadata: Metadata = {
  title: 'NODE - Northern Ontario Dev Exchange',
  description: "Career, growth, and connection for devs in Northern Ontario. Professional advancement for software developers.",
  icons: {
    icon: 'https://framerusercontent.com/images/pbpLLf9olTf1CmG5IqdddUkc0fQ.png',
    apple: 'https://framerusercontent.com/images/pbpLLf9olTf1CmG5IqdddUkc0fQ.png',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Disable appear animations before any scripts run */}
        <script dangerouslySetInnerHTML={{ __html: 'window.__framer_disable_appear_effects_optimization__=true' }} />
        {/* Suppress hydration errors from reaching Next.js dev overlay - must run before React hydrates */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){
  function isFE(m){return typeof m==='string'&&(m.includes('framerusercontent.com')||m.includes('Minified React error #42')||m.includes('server/client mismatch')||m.includes('Hydration failed')||m.includes('did not match'));}
  var ce=console.error;console.error=function(){if(isFE(arguments[0])||isFE(arguments[1]))return;ce.apply(console,arguments);};
  if(window.reportError){var re=window.reportError;window.reportError=function(e){var m=e instanceof Error?e.message:String(e);if(isFE(m))return;re(e);};}
  window.addEventListener('error',function(ev){if(ev.filename&&ev.filename.includes('framerusercontent.com')){ev.preventDefault();ev.stopImmediatePropagation();}},true);
})();` }} />
        <link rel="modulepreload" href="https://framerusercontent.com/sites/1mHyxAyslFnBo5xl25Yxxz/react.Dm4Wa5nD.mjs" />
        <link rel="modulepreload" href="https://framerusercontent.com/sites/1mHyxAyslFnBo5xl25Yxxz/rolldown-runtime.BRwTesTf.mjs" />
        <link rel="modulepreload" href="https://framerusercontent.com/sites/1mHyxAyslFnBo5xl25Yxxz/motion.DHZZGaip.mjs" />
        <link rel="modulepreload" href="https://framerusercontent.com/sites/1mHyxAyslFnBo5xl25Yxxz/framer.fpvmGwKb.mjs" />
        <link rel="modulepreload" href="https://framerusercontent.com/sites/1mHyxAyslFnBo5xl25Yxxz/shared-lib.CyHeDOxi.mjs" />
        <link rel="modulepreload" href="/content_chunk.mjs?v=14" />
      </head>
      <body suppressHydrationWarning>
        <FramerErrorSuppressor />
        {children}
        {/* Analytics script removed - not needed */}
      </body>
    </html>
  )
}
