import React, { useState } from 'react';
import { Smartphone, Download, X, Sparkles } from 'lucide-react';
import { usePwaInstall } from '../hooks/usePwaInstall';
import { Button } from './ui';
import { cn } from '../lib/utils';

export function InstallPromptBanner() {
  const {
    isInstalled,
    promptInstall
  } = usePwaInstall();

  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return sessionStorage.getItem('averian_install_banner_dismissed') === 'true';
  });

  // If currently running in standalone PWA app window or dismissed for this session, don't show
  if (isInstalled || dismissed) {
    return null;
  }

  const handleDismiss = () => {
    setDismissed(true);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('averian_install_banner_dismissed', 'true');
    }
  };

  return (
    <div className="bg-gradient-to-r from-amber-500/15 via-gold-500/20 to-amber-500/15 border-b border-amber-500/30 px-3 sm:px-4 py-2 flex items-center justify-between gap-3 text-xs text-amber-200 backdrop-blur-md animate-in slide-in-from-top-2 duration-300">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center justify-center shrink-0">
          <Smartphone size={15} />
        </div>
        <div className="min-w-0">
          <p className="font-black text-white text-xs flex items-center gap-1.5 truncate">
            Install The Averian App
            <span className="hidden sm:inline text-[9px] font-semibold text-amber-300/90 bg-amber-500/20 px-1.5 py-0.2 rounded-full border border-amber-500/30">
              Offline Ready
            </span>
          </p>
          <p className="text-[11px] text-zinc-400 truncate hidden xs:block">
            One-tap home screen access, offline database sync, and fast load speeds.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Button
          onClick={promptInstall}
          className="bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase tracking-wider px-3 py-1.5 rounded-xl shadow-md cursor-pointer h-auto"
        >
          <Download size={13} className="mr-1 sm:mr-1.5" />
          <span className="hidden sm:inline">Install App</span>
          <span className="sm:hidden">Install</span>
        </Button>
        <button
          onClick={handleDismiss}
          className="text-zinc-500 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors"
          title="Dismiss for this session"
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
}
