import type { Metadata, Viewport } from 'next'
import Script from 'next/script'
import './globals.css'
import './framer.css'
import { FramerErrorSuppressor } from '../components/FramerErrorSuppressor'
import { InstallPrompt } from '../components/pwa/InstallPrompt'
import { Inter } from "next/font/google";
import { cn } from "@/lib/utils";

const inter = Inter({subsets:['latin'],variable:'--font-sans'});

export const viewport: Viewport = {
  themeColor: '#0b1120',
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  title: {
    default: 'NODE Sudbury',
    template: '%s | NODE Sudbury',
  },
  description: 'Northern Ontario Developer Exchange - tech community events, hackathons, and networking in Greater Sudbury.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'https://nodesudbury.com'),
  manifest: '/manifest.json',
  icons: {
    icon: 'https://framerusercontent.com/images/pbpLLf9olTf1CmG5IqdddUkc0fQ.png',
    apple: 'https://framerusercontent.com/images/pbpLLf9olTf1CmG5IqdddUkc0fQ.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'NODE Sudbury',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
  openGraph: {
    siteName: 'NODE Sudbury',
    locale: 'en_CA',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    site: '@nodesudbury',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={cn("dark font-sans", inter.variable)}>
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
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-sky-500 focus:text-black focus:font-bold focus:px-4 focus:py-2 focus:rounded-lg focus:outline-none"
        >
          Skip to main content
        </a>
        <FramerErrorSuppressor />
        <main id="main-content">{children}</main>
        <InstallPrompt />
      </body>
    </html>
  )
}
