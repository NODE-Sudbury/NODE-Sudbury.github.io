'use client';

import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPrompt() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setDismissed(true);
      return;
    }
    const handler = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!prompt || dismissed) return null;

  const handleInstall = async () => {
    if (!prompt) return;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === 'accepted') setDismissed(true);
    setPrompt(null);
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 bg-gray-900 border border-sky-500/30 rounded-xl p-4 shadow-2xl z-50 flex items-center gap-3">
      <div className="flex-1">
        <p className="text-sm font-semibold text-white">Add NODE to your home screen</p>
        <p className="text-xs text-gray-400 mt-0.5">Quick access to events and your dashboard</p>
      </div>
      <div className="flex gap-2 flex-shrink-0">
        <button
          onClick={() => setDismissed(true)}
          className="text-xs text-gray-500 hover:text-gray-300 px-2 py-1 transition-colors"
        >
          Later
        </button>
        <button
          onClick={handleInstall}
          className="text-xs bg-sky-500 hover:bg-sky-400 text-black font-bold px-3 py-1.5 rounded-lg transition-colors"
        >
          Install
        </button>
      </div>
    </div>
  );
}
