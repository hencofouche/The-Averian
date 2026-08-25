import React from 'react';
import { Download, Smartphone, Laptop, CheckCircle2, Share, PlusSquare, X } from 'lucide-react';
import { usePwaInstall } from '../hooks/usePwaInstall';
import { Button } from './ui';
import { cn } from '../lib/utils';

interface InstallAppButtonProps {
  variant?: 'header' | 'sidebar' | 'settings' | 'floating' | 'banner';
  className?: string;
  showAlwaysInSettings?: boolean;
}

export function InstallAppButton({
  variant = 'header',
  className,
  showAlwaysInSettings = false
}: InstallAppButtonProps) {
  const {
    isInstallable,
    isInstalled,
    isIos,
    showIosGuide,
    setShowIosGuide,
    promptInstall
  } = usePwaInstall();

  // If already installed on this device, hide the button completely (unless in settings where we show 'Installed' status)
  if (isInstalled) {
    if (variant === 'settings' || showAlwaysInSettings) {
      return (
        <div className={cn("p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center gap-3", className)}>
          <CheckCircle2 size={20} className="text-emerald-400 shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-bold text-emerald-300">Installed on this Device</p>
            <p className="text-[11px] text-zinc-400">The Averian is active in standalone app mode with offline storage.</p>
          </div>
        </div>
      );
    }
    return null;
  }

  // If browser hasn't passed beforeinstallprompt and it's not iOS and not in settings, hide in header/sidebar to keep UI minimal
  if (!isInstallable && !isIos && variant !== 'settings') {
    return null;
  }

  return (
    <>
      {variant === 'header' && (
        <button
          onClick={promptInstall}
          className={cn(
            "relative group flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/20 via-gold-500/20 to-amber-500/20 hover:from-amber-500/30 hover:to-gold-500/30 text-amber-300 border border-amber-500/40 text-xs font-black uppercase tracking-wider transition-all duration-300 shadow-lg shadow-amber-500/10 hover:scale-[1.02] cursor-pointer animate-pulse hover:animate-none",
            className
          )}
          title="Install The Averian on this device for instant offline access"
        >
          <Smartphone size={14} className="text-amber-400 shrink-0" />
          <span className="hidden sm:inline">Install App</span>
          <span className="sm:hidden">Install</span>
          <span className="flex h-1.5 w-1.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span>
          </span>
        </button>
      )}

      {variant === 'sidebar' && (
        <button
          onClick={promptInstall}
          className={cn(
            "w-full flex items-center gap-2.5 p-2 rounded-xl text-amber-300 hover:text-white bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 transition-all text-xs font-bold uppercase tracking-wider group cursor-pointer",
            className
          )}
        >
          <div className="w-7 h-7 flex items-center justify-center rounded-lg bg-amber-500/20 text-amber-300 group-hover:scale-110 transition-transform">
            <Download size={14} />
          </div>
          <span>Install as App</span>
        </button>
      )}

      {variant === 'settings' && (
        <div className={cn("p-4 bg-zinc-900/90 border border-amber-500/30 rounded-2xl space-y-3", className)}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                <Laptop size={20} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Install The Averian App</h4>
                <p className="text-xs text-zinc-400">Launch directly from your home screen or desktop with 100% offline capability.</p>
              </div>
            </div>
            <Button
              onClick={promptInstall}
              className="bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase tracking-wider px-4 py-2 shrink-0"
            >
              <Download size={14} className="mr-1.5" />
              Install Now
            </Button>
          </div>
        </div>
      )}

      {/* iOS Step-by-Step Installation Modal */}
      {showIosGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-zinc-950 border border-zinc-800 rounded-3xl p-6 space-y-5 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2 text-amber-400">
                <Smartphone size={20} />
                <h3 className="text-sm font-black uppercase tracking-wider text-white">
                  Install on iOS / Safari
                </h3>
              </div>
              <button
                onClick={() => setShowIosGuide(false)}
                className="text-zinc-500 hover:text-white p-1"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs text-zinc-300">
              <p className="text-zinc-400 leading-relaxed">
                To install <strong className="text-white">The Averian</strong> on your iPhone or iPad home screen:
              </p>

              <div className="p-3 bg-zinc-900/80 border border-zinc-800 rounded-2xl flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 font-black">
                  1
                </div>
                <div className="space-y-0.5">
                  <p className="font-bold text-white flex items-center gap-1.5">
                    Tap Share Button <Share size={14} className="text-blue-400 inline" />
                  </p>
                  <p className="text-[11px] text-zinc-400">Located in the Safari toolbar (bottom on iPhone, top on iPad).</p>
                </div>
              </div>

              <div className="p-3 bg-zinc-900/80 border border-zinc-800 rounded-2xl flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 font-black">
                  2
                </div>
                <div className="space-y-0.5">
                  <p className="font-bold text-white flex items-center gap-1.5">
                    Tap 'Add to Home Screen' <PlusSquare size={14} className="text-amber-400 inline" />
                  </p>
                  <p className="text-[11px] text-zinc-400">Scroll down in the share menu to find this option.</p>
                </div>
              </div>

              <div className="p-3 bg-zinc-900/80 border border-zinc-800 rounded-2xl flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 font-black">
                  3
                </div>
                <div className="space-y-0.5">
                  <p className="font-bold text-white">Tap 'Add' in Top Right</p>
                  <p className="text-[11px] text-zinc-400">The Averian icon will appear on your home screen ready to use!</p>
                </div>
              </div>
            </div>

            <Button
              onClick={() => setShowIosGuide(false)}
              className="w-full bg-gold-500 hover:bg-gold-400 text-black font-bold text-xs py-2.5 rounded-xl"
            >
              Got It
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
