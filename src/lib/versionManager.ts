/**
 * PWA Version Manager & Automatic Update Engine
 * Ensures seamless background app updates, purges stale code assets,
 * and recovers from chunk errors without disrupting the user's login session.
 */

export const CURRENT_APP_VERSION = '1.0.25';

// Local storage key for tracking stored version
const VERSION_KEY = 'averian_app_version';

// List of localStorage prefix/keys to explicitly KEEP (preserving login session and user preferences/welcome status)
const PERSISTENT_STORAGE_PREFIXES = [
  'firebase:',
  'firebaseLocalStore',
  'g_state',
  'averian_'
];

/**
 * Safely purges obsolete application cache from localStorage
 * while preserving Firebase Auth session tokens and user onboarding state.
 */
export function purgeStaleAppData() {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      // Check if key is related to Auth or critical user state/preferences
      const isPersistentKey = PERSISTENT_STORAGE_PREFIXES.some(prefix => key.startsWith(prefix));
      if (!isPersistentKey && key !== VERSION_KEY) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach(k => {
      try {
        localStorage.removeItem(k);
      } catch (_) {}
    });

    console.log(`[VersionManager] Purged ${keysToRemove.length} stale local cache entries. Auth preserved.`);
  } catch (err) {
    console.warn('[VersionManager] Cache purge warning:', err);
  }
}

/**
 * Clears Service Worker CacheStorage caches
 */
export async function clearServiceWorkerCaches(): Promise<void> {
  if ('caches' in window) {
    try {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
      console.log('[VersionManager] Service Worker CacheStorage cleared.');
    } catch (err) {
      console.warn('[VersionManager] Service worker cache clearing failed:', err);
    }
  }
}

/**
 * Checks the live server version.json endpoint.
 * If a new build version is found or if force is true, purges stale assets and reloads safely.
 */
export async function checkAndApplyAppUpdate(force = false): Promise<boolean> {
  if (!navigator.onLine && !force) return false;

  try {
    const res = await fetch(`/version.json?t=${Date.now()}`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    });

    if (!res.ok) return false;

    const data = await res.json();
    const serverVersion = data.version || CURRENT_APP_VERSION;
    const storedVersion = localStorage.getItem(VERSION_KEY);

    const needsUpdate = force || (storedVersion && storedVersion !== serverVersion) || (storedVersion !== CURRENT_APP_VERSION);

    if (needsUpdate) {
      console.log(`[VersionManager] New deployment detected (${storedVersion} -> ${serverVersion}). Updating PWA...`);

      // 1. Clear SW cache
      await clearServiceWorkerCaches();

      // 2. Instruct SW to skip waiting if available
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg) {
          if (reg.waiting) {
            reg.waiting.postMessage({ type: 'SKIP_WAITING' });
          }
          await reg.update().catch(() => {});
        }
      }

      // 3. Purge non-auth stale local storage items
      purgeStaleAppData();

      // 4. Record new version
      localStorage.setItem(VERSION_KEY, serverVersion);

      // 5. Smoothly reload page
      console.log('[VersionManager] Reloading page to load fresh assets...');
      window.location.reload();
      return true;
    } else {
      // Record current version if not set
      if (!storedVersion) {
        localStorage.setItem(VERSION_KEY, serverVersion);
      }
    }
  } catch (err) {
    console.warn('[VersionManager] Version check skipped:', err);
  }

  return false;
}

/**
 * Installs global handlers for dynamic chunk import failures.
 * Automatically recovers from missing/stale JS chunks on new deployments.
 */
export function initGlobalErrorHandlers() {
  if (typeof window === 'undefined') return;

  // Handle global unhandled script errors
  window.addEventListener('error', (event) => {
    const msg = event?.message || event?.error?.message || '';
    if (
      msg.includes('Failed to fetch dynamically imported module') ||
      msg.includes('Importing a module script failed') ||
      msg.includes('Loading chunk') ||
      msg.includes('Unexpected token')
    ) {
      console.warn('[VersionManager] Detected stale module chunk error. Triggering auto-update reload...');
      event.preventDefault();
      checkAndApplyAppUpdate(true);
    }
  });

  // Handle promise rejections for chunk loading failures
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event?.reason?.message || String(event?.reason || '');
    if (
      reason.includes('Failed to fetch dynamically imported module') ||
      reason.includes('Importing a module script failed') ||
      reason.includes('Loading chunk')
    ) {
      console.warn('[VersionManager] Detected unhandled chunk promise rejection. Triggering auto-update reload...');
      event.preventDefault();
      checkAndApplyAppUpdate(true);
    }
  });
}

/**
 * Initializes version tracking, periodic background update polling, and tab visibility checks.
 */
export function initVersionManager() {
  if (typeof window === 'undefined') return;

  // 1. Register global script error listeners
  initGlobalErrorHandlers();

  // 2. Perform check on launch
  setTimeout(() => {
    checkAndApplyAppUpdate();
  }, 1000);

  // 3. Check when returning to tab / app
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      checkAndApplyAppUpdate();
    }
  });

  // 4. Poll every 5 minutes
  setInterval(() => {
    checkAndApplyAppUpdate();
  }, 5 * 60 * 1000);
}
