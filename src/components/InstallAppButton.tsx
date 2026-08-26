import React, { useState } from 'react';
import { 
  Download, 
  Smartphone, 
  Laptop, 
  CheckCircle2, 
  Share, 
  PlusSquare, 
  X, 
  Monitor, 
  MoreVertical, 
  ArrowRight, 
  Sparkles,
  HelpCircle,
  ExternalLink
} from 'lucide-react';
import { usePwaInstall } from '../hooks/usePwaInstall';
import { Button } from './ui';
import { cn } from '../lib/utils';

interface InstallAppButtonProps {
  variant?: 'header' | 'header-mobile' | 'sidebar' | 'settings' | 'floating' | 'banner';
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
    isAndroid,
    isChrome,
    isEdge,
    showInstallModal,
    setShowInstallModal,
    promptInstall
  } = usePwaInstall();

  const [activeGuideTab, setActiveGuideTab] = useState<'auto' | 'chrome' | 'android' | 'ios' | 'edge'>(() => {
    if (isIos) return 'ios';
    if (isAndroid) return 'android';
    if (isEdge) return 'edge';
    return 'chrome';
  });

  // If already installed in standalone window, show status only in settings, otherwise hide
  if (isInstalled) {
    if (variant === 'settings' || showAlwaysInSettings) {
      return (
        <div className={cn("p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center gap-3", className)}>
          <CheckCircle2 size={22} className="text-emerald-400 shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-bold text-emerald-300">Installed in Standalone App Mode</p>
            <p className="text-[11px] text-zinc-400">The Averian is currently active with offline storage & instant launch.</p>
          </div>
        </div>
      );
    }
    return null;
  }

  return (
    <>
      {/* 1. Header Desktop Variant */}
      {variant === 'header' && (
        <button
          onClick={promptInstall}
          className={cn(
            "relative group flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-amber-500/20 via-gold-500/20 to-amber-500/20 hover:from-amber-500/30 hover:to-gold-500/30 text-amber-300 border border-amber-500/40 text-xs font-black uppercase tracking-wider transition-all duration-200 shadow-md shadow-amber-500/5 hover:scale-[1.02] cursor-pointer",
            className
          )}
          title="Install The Averian on this device for offline access & faster speed"
        >
          <Smartphone size={14} className="text-amber-400 shrink-0 group-hover:scale-110 transition-transform" />
          <span className="hidden sm:inline">Install App</span>
          <span className="sm:hidden">Install</span>
          <span className="flex h-1.5 w-1.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span>
          </span>
        </button>
      )}

      {/* 2. Header Mobile Variant */}
      {variant === 'header-mobile' && (
        <button
          onClick={promptInstall}
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-amber-500/15 text-amber-300 border border-amber-500/30 text-xs font-bold transition-all hover:bg-amber-500/25 active:scale-95 cursor-pointer",
            className
          )}
          title="Install App"
        >
          <Download size={14} className="text-amber-400" />
          <span className="text-[11px] uppercase tracking-wider font-black">Install</span>
        </button>
      )}

      {/* 3. Sidebar Variant */}
      {variant === 'sidebar' && (
        <button
          onClick={promptInstall}
          className={cn(
            "w-full flex items-center gap-2.5 p-2 rounded-xl text-amber-300 hover:text-white bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 transition-all text-xs font-bold uppercase tracking-wider group cursor-pointer shadow-sm",
            className
          )}
        >
          <div className="w-7 h-7 flex items-center justify-center rounded-lg bg-amber-500/20 text-amber-300 group-hover:scale-110 transition-transform">
            <Download size={14} />
          </div>
          <div className="flex flex-col text-left">
            <span className="leading-tight">Install as App</span>
            <span className="text-[9px] text-zinc-400 font-normal normal-case">Fast & Offline Ready</span>
          </div>
        </button>
      )}

      {/* 4. Settings Variant */}
      {variant === 'settings' && (
        <div className={cn("p-4 bg-zinc-900/90 border border-amber-500/30 rounded-2xl space-y-3", className)}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                <Laptop size={20} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  Install The Averian App
                  <span className="text-[10px] font-semibold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/30">
                    PWA Ready
                  </span>
                </h4>
                <p className="text-xs text-zinc-400">Launch directly from your home screen or desktop with offline storage capability.</p>
              </div>
            </div>
            <Button
              onClick={promptInstall}
              className="bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase tracking-wider px-4 py-2 shrink-0 self-start sm:self-auto"
            >
              <Download size={14} className="mr-1.5" />
              Install Now
            </Button>
          </div>
        </div>
      )}

      {/* 5. Interactive Installation Guide Modal */}
      {showInstallModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-3xl p-6 space-y-5 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2.5 text-amber-400">
                <Smartphone size={22} />
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-white">
                    Install The Averian App
                  </h3>
                  <p className="text-[11px] text-zinc-400">Fast home screen launch & 100% offline access</p>
                </div>
              </div>
              <button
                onClick={() => setShowInstallModal(false)}
                className="text-zinc-500 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Platform Selector Tabs */}
            <div className="grid grid-cols-4 gap-1.5 p-1 bg-zinc-900 rounded-xl border border-zinc-800 text-xs">
              <button
                onClick={() => setActiveGuideTab('chrome')}
                className={cn(
                  "py-1.5 px-2 rounded-lg font-bold transition-all text-center truncate",
                  activeGuideTab === 'chrome' ? "bg-amber-500 text-black shadow-sm" : "text-zinc-400 hover:text-white"
                )}
              >
                Chrome
              </button>
              <button
                onClick={() => setActiveGuideTab('android')}
                className={cn(
                  "py-1.5 px-2 rounded-lg font-bold transition-all text-center truncate",
                  activeGuideTab === 'android' ? "bg-amber-500 text-black shadow-sm" : "text-zinc-400 hover:text-white"
                )}
              >
                Android
              </button>
              <button
                onClick={() => setActiveGuideTab('ios')}
                className={cn(
                  "py-1.5 px-2 rounded-lg font-bold transition-all text-center truncate",
                  activeGuideTab === 'ios' ? "bg-amber-500 text-black shadow-sm" : "text-zinc-400 hover:text-white"
                )}
              >
                iOS / Safari
              </button>
              <button
                onClick={() => setActiveGuideTab('edge')}
                className={cn(
                  "py-1.5 px-2 rounded-lg font-bold transition-all text-center truncate",
                  activeGuideTab === 'edge' ? "bg-amber-500 text-black shadow-sm" : "text-zinc-400 hover:text-white"
                )}
              >
                Edge / PC
              </button>
            </div>

            {/* Instructions Content */}
            <div className="space-y-3">
              {/* CHROME DESKTOP GUIDE */}
              {activeGuideTab === 'chrome' && (
                <div className="space-y-2.5 text-xs text-zinc-300 animate-in fade-in">
                  <div className="p-3 bg-zinc-900/80 border border-zinc-800 rounded-2xl flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 font-black text-xs">
                      1
                    </div>
                    <div>
                      <p className="font-bold text-white">Look at the Chrome Address Bar</p>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        In Google Chrome, look at the right side of the URL bar (top of screen) for the <strong className="text-amber-300">Install icon (⊕ or computer icon)</strong>.
                      </p>
                    </div>
                  </div>

                  <div className="p-3 bg-zinc-900/80 border border-zinc-800 rounded-2xl flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 font-black text-xs">
                      2
                    </div>
                    <div>
                      <p className="font-bold text-white">Or Open Chrome Menu (⋮)</p>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        Click the three dots <MoreVertical size={12} className="inline text-zinc-400" /> in the top right corner of Chrome → select <strong className="text-white">"Install The Averian..."</strong> or <strong className="text-white">"Cast, save, and share" → "Install page as app"</strong>.
                      </p>
                    </div>
                  </div>

                  <div className="p-3 bg-zinc-900/80 border border-zinc-800 rounded-2xl flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 font-black text-xs">
                      3
                    </div>
                    <div>
                      <p className="font-bold text-white">Click "Install"</p>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        The Averian will open in its own clean, borderless app window and add a shortcut to your desktop & app launcher.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* ANDROID CHROME GUIDE */}
              {activeGuideTab === 'android' && (
                <div className="space-y-2.5 text-xs text-zinc-300 animate-in fade-in">
                  <div className="p-3 bg-zinc-900/80 border border-zinc-800 rounded-2xl flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 font-black text-xs">
                      1
                    </div>
                    <div>
                      <p className="font-bold text-white">Tap Chrome Menu (⋮)</p>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        In Chrome on your Android phone, tap the three dots <MoreVertical size={12} className="inline text-zinc-400" /> at the top right of your screen.
                      </p>
                    </div>
                  </div>

                  <div className="p-3 bg-zinc-900/80 border border-zinc-800 rounded-2xl flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 font-black text-xs">
                      2
                    </div>
                    <div>
                      <p className="font-bold text-white">Tap 'Install App' or 'Add to Home screen'</p>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        Select <strong className="text-white">"Install app"</strong> or <strong className="text-white">"Add to Home screen"</strong> from the menu options.
                      </p>
                    </div>
                  </div>

                  <div className="p-3 bg-zinc-900/80 border border-zinc-800 rounded-2xl flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 font-black text-xs">
                      3
                    </div>
                    <div>
                      <p className="font-bold text-white">Confirm Installation</p>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        Tap Install in the popup. The Averian icon will be placed directly on your phone's home screen!
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* IOS SAFARI GUIDE */}
              {activeGuideTab === 'ios' && (
                <div className="space-y-2.5 text-xs text-zinc-300 animate-in fade-in">
                  <div className="p-3 bg-zinc-900/80 border border-zinc-800 rounded-2xl flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 font-black text-xs">
                      1
                    </div>
                    <div>
                      <p className="font-bold text-white flex items-center gap-1.5">
                        Tap Safari Share Button <Share size={13} className="text-blue-400 inline" />
                      </p>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        Located in the Safari toolbar at the bottom of your iPhone (or top of iPad).
                      </p>
                    </div>
                  </div>

                  <div className="p-3 bg-zinc-900/80 border border-zinc-800 rounded-2xl flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 font-black text-xs">
                      2
                    </div>
                    <div>
                      <p className="font-bold text-white flex items-center gap-1.5">
                        Tap 'Add to Home Screen' <PlusSquare size={13} className="text-amber-400 inline" />
                      </p>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        Scroll down through the share sheet options and tap "Add to Home Screen".
                      </p>
                    </div>
                  </div>

                  <div className="p-3 bg-zinc-900/80 border border-zinc-800 rounded-2xl flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 font-black text-xs">
                      3
                    </div>
                    <div>
                      <p className="font-bold text-white">Tap 'Add' in Top Right</p>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        Confirm by tapping Add. You can now launch The Averian just like any native iOS application.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* EDGE GUIDE */}
              {activeGuideTab === 'edge' && (
                <div className="space-y-2.5 text-xs text-zinc-300 animate-in fade-in">
                  <div className="p-3 bg-zinc-900/80 border border-zinc-800 rounded-2xl flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0 font-black text-xs">
                      1
                    </div>
                    <div>
                      <p className="font-bold text-white">Click 'App Available' Icon</p>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        In Microsoft Edge, click the <strong className="text-cyan-300">App Available (⊞)</strong> button in the right of the address bar.
                      </p>
                    </div>
                  </div>

                  <div className="p-3 bg-zinc-900/80 border border-zinc-800 rounded-2xl flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 font-black text-xs">
                      2
                    </div>
                    <div>
                      <p className="font-bold text-white">Or Edge Menu (...) → Apps</p>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        Click Menu (...) → <strong className="text-white">"Apps"</strong> → <strong className="text-white">"Install The Averian"</strong>.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center gap-2 pt-2">
              <Button
                onClick={() => setShowInstallModal(false)}
                className="w-full bg-gold-500 hover:bg-gold-400 text-black font-bold text-xs py-2.5 rounded-xl"
              >
                Got It, Thanks!
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
