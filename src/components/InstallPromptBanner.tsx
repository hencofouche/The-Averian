import React, { useState } from 'react';
import { Smartphone, Download, X, Sparkles, ShieldCheck } from 'lucide-react';
import { usePwaInstall } from '../hooks/usePwaInstall';
import { Button } from './ui';
import { cn } from '../lib/utils';

export function InstallPromptBanner() {
  const {
    isInstallable,
    isInstalled,
    promptInstall
  } = usePwaInstall();

  const [dismissed, setDismissed] = useState(() => {
    return sessionStorage.getItem('averian_install_banner_dismissed') === 'true';
  });

  // If already installed or dismissed this session or browser hasn't passed install prompt, don't show
  if (isInstalled || dismissed || !isInstallable) {
    return null;
  }

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem('averian_install_banner_dismissed', 'true');
  };

  return (
    <div className="bg-gradient-to-r from-amber-500/15 via-gold-500/20 to-amber-500/15 border-b border-amber-500/30 px-4 py-2.5 flex items-center justify-between gap-3 text-xs text-amber-200 backdrop-blur-md animate-in slide-in-from-top-2 duration-300">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center justify-center shrink-0">
          <Smartphone size={16} />
        </div>
        <div className="min-w-0">
          <p className="font-black text-white text-xs flex items-center gap-1.5 truncate">
            Install The Averian App on this Device
            <span className="hidden sm:inline text-[10px] font-semibold text-amber-300/80 bg-amber-500/20 px-1.5 py-0.2 rounded-full border border-amber-500/30">
              Offline Ready
            </span>
          </p>
          <p className="text-[11px] text-zinc-400 truncate">
            Instant home screen launch, full offline caching, and faster load times.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Button
          onClick={promptInstall}
          className="bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase tracking-wider px-3.5 py-1.5 rounded-xl shadow-md cursor-pointer"
        >
          <Download size={13} className="mr-1.5" />
          Install App
        </Button>
        <button
          onClick={handleDismiss}
          className="text-zinc-500 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors"
          title="Dismiss for this session"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
