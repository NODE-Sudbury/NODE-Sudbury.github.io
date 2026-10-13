export const dynamic = 'force-dynamic'

import { EmbedGenerator } from './EmbedGenerator'

export const metadata = {
  title: 'Embed Widget | NODE Sudbury',
  description: 'Embed the NODE Sudbury events calendar on your website.',
}

export default function EmbedPage() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://nodesudbury.com'

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-10">
          <p className="text-sky-400 text-sm font-semibold uppercase tracking-widest mb-3">Partner Tools</p>
          <h1 className="text-3xl font-bold text-white mb-3">Embed NODE Events</h1>
          <p className="text-gray-400 max-w-xl">
            Show upcoming NODE Sudbury events on your website. Customize the widget and copy the embed code below.
          </p>
        </div>
        <EmbedGenerator appUrl={appUrl} />
      </div>
    </div>
  )
}
