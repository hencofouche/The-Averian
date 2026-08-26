import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

declare global {
  interface Window {
    __pwa_deferred_prompt?: any;
  }
}

export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(() => {
    if (typeof window !== 'undefined' && window.__pwa_deferred_prompt) {
      return window.__pwa_deferred_prompt;
    }
    return null;
  });

  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isChrome, setIsChrome] = useState(false);
  const [isEdge, setIsEdge] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);

  useEffect(() => {
    // 1. Detect if currently running in standalone PWA mode
    const checkStandalone = () => {
      if (typeof window === 'undefined') return false;
      const isStandaloneMedia = window.matchMedia('(display-mode: standalone)').matches;
      const isFullscreenMedia = window.matchMedia('(display-mode: fullscreen)').matches;
      const isMinimalUiMedia = window.matchMedia('(display-mode: minimal-ui)').matches;
      const isIosStandalone = (window.navigator as any).standalone === true;
      const isAndroidApp = document.referrer?.includes('android-app://') || false;

      const runningInStandalone = isStandaloneMedia || isFullscreenMedia || isMinimalUiMedia || isIosStandalone || isAndroidApp;
      setIsInstalled(runningInStandalone);
      return runningInStandalone;
    };

    const isCurrentlyStandalone = checkStandalone();

    // 2. Browser & OS Detection
    if (typeof window !== 'undefined') {
      const userAgent = window.navigator.userAgent.toLowerCase();
      const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
      const isAndroidDevice = /android/.test(userAgent);
      const isEdgeBrowser = /edg\//.test(userAgent);
      const isChromeBrowser = /chrome|crios/.test(userAgent) && !isEdgeBrowser;

      setIsIos(isIosDevice);
      setIsAndroid(isAndroidDevice);
      setIsChrome(isChromeBrowser);
      setIsEdge(isEdgeBrowser);
    }

    // If early prompt was caught in index.html
    if (window.__pwa_deferred_prompt) {
      setDeferredPrompt(window.__pwa_deferred_prompt);
      setIsInstallable(true);
    }

    // 3. Event Handlers
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      window.__pwa_deferred_prompt = e;
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    const handlePromptReadyCustom = (e: any) => {
      if (e.detail) {
        setDeferredPrompt(e.detail);
        setIsInstallable(true);
      }
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
      window.__pwa_deferred_prompt = null;
      setShowInstallModal(false);
      toast.success('The Averian was successfully installed on this device!');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('pwa_prompt_ready', handlePromptReadyCustom);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Watch for display mode changes (e.g. if opened as standalone window)
    const mediaMatcher = window.matchMedia('(display-mode: standalone)');
    const handleMediaChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setIsInstalled(true);
        setIsInstallable(false);
      }
    };
    try {
      mediaMatcher.addEventListener('change', handleMediaChange);
    } catch {
      // Fallback
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('pwa_prompt_ready', handlePromptReadyCustom);
      window.removeEventListener('appinstalled', handleAppInstalled);
      try {
        mediaMatcher.removeEventListener('change', handleMediaChange);
      } catch {
        // Fallback
      }
    };
  }, []);

  // Trigger the installation flow or open guide
  const promptInstall = useCallback(async () => {
    if (isInstalled) {
      toast.info('The Averian is already running as an installed application.');
      return;
    }

    const currentPrompt = deferredPrompt || window.__pwa_deferred_prompt;

    if (currentPrompt && typeof currentPrompt.prompt === 'function') {
      try {
        await currentPrompt.prompt();
        const choiceResult = await currentPrompt.userChoice;
        if (choiceResult && choiceResult.outcome === 'accepted') {
          setIsInstalled(true);
          setIsInstallable(false);
          setDeferredPrompt(null);
          window.__pwa_deferred_prompt = null;
          setShowInstallModal(false);
          toast.success('Thank you for installing The Averian!');
          return;
        }
      } catch (err: any) {
        console.warn('[PWA] Native prompt invocation error, showing installation guide:', err);
      }
    }

    // If native prompt was not triggerable or user needs guidance, show the interactive guide
    setShowInstallModal(true);
  }, [deferredPrompt, isInstalled]);

  return {
    isInstallable,
    isInstalled,
    isIos,
    isAndroid,
    isChrome,
    isEdge,
    showInstallModal,
    setShowInstallModal,
    promptInstall
  };
}
