import { useState, useEffect } from 'react';
import { toast } from 'sonner';

// Custom hook to detect PWA installation capability & installed state
export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);

  useEffect(() => {
    // 1. Detect if already installed / running in standalone mode on this device
    const checkStandalone = () => {
      const isStandaloneMedia = window.matchMedia('(display-mode: standalone)').matches;
      const isStandaloneMediaMinimal = window.matchMedia('(display-mode: minimal-ui)').matches;
      const isIosStandalone = (window.navigator as any).standalone === true;
      const isAndroidApp = document.referrer.includes('android-app://');
      const isMarkedInstalled = localStorage.getItem('averian_pwa_installed_on_device') === 'true';

      if (isStandaloneMedia || isStandaloneMediaMinimal || isIosStandalone || isAndroidApp || isMarkedInstalled) {
        setIsInstalled(true);
        setIsInstallable(false);
        return true;
      }
      return false;
    };

    const alreadyInstalled = checkStandalone();

    // 2. Detect iOS environment
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIos(isIosDevice);

    // If already installed on this device, no need to listen for prompt
    if (alreadyInstalled) {
      return;
    }

    // 3. Listen for browser passing 'beforeinstallprompt'
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent browser's mini-infobar default
      e.preventDefault();
      // Stash the event so it can be triggered later
      setDeferredPrompt(e);
      setIsInstallable(true);
      console.log('[PWA] Browser passed beforeinstallprompt. Ready to install.');
    };

    // 4. Listen for app completion event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
      localStorage.setItem('averian_pwa_installed_on_device', 'true');
      toast.success('The Averian was successfully installed on this device!');
      console.log('[PWA] App installed successfully.');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Also listen for display-mode changes (e.g. if opened in standalone window)
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
      // Fallback for older browsers
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      try {
        mediaMatcher.removeEventListener('change', handleMediaChange);
      } catch {
        // Fallback
      }
    };
  }, []);

  // Trigger the installation flow
  const promptInstall = async () => {
    if (isInstalled) {
      toast.info('The Averian is already installed on this device.');
      return;
    }

    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choiceResult = await deferredPrompt.userChoice;
        if (choiceResult.outcome === 'accepted') {
          setIsInstalled(true);
          setIsInstallable(false);
          setDeferredPrompt(null);
          localStorage.setItem('averian_pwa_installed_on_device', 'true');
          toast.success('Thank you for installing The Averian!');
        } else {
          console.log('[PWA] User dismissed install prompt');
        }
      } catch (err: any) {
        console.error('[PWA] Install prompt error:', err);
      }
      return;
    }

    if (isIos) {
      setShowIosGuide(true);
      return;
    }

    // Generic guide if browser didn't pass beforeinstallprompt yet
    toast.info('To install: click the Install icon in your browser address bar or menu ("Install App" / "Add to Home screen").', {
      duration: 6000
    });
  };

  return {
    isInstallable,
    isInstalled,
    isIos,
    showIosGuide,
    setShowIosGuide,
    promptInstall
  };
}
