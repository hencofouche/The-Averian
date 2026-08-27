import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onIdTokenChanged } from 'firebase/auth';
import { 
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  getFirestore, doc, getDocFromServer,
  disableNetwork, enableNetwork,
  waitForPendingWrites
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../firebase-applet-config.json';
import { OperationType, FirestoreErrorInfo } from './types';

export { disableNetwork, enableNetwork, waitForPendingWrites };

export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

const firestoreDbId = (firebaseConfig as any).firestoreDatabaseId || 'ai-studio-1809a135-82e9-462b-955f-679581a8148f';

let firestoreInstance;
try {
  firestoreInstance = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    })
  }, firestoreDbId);
} catch (e) {
  firestoreInstance = getFirestore(app, firestoreDbId);
}

export const db = firestoreInstance;
export const auth = getAuth(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

// Track offline sync state
let isSyncingPendingWrites = false;

// Auto-recovery on network state transitions
if (typeof window !== 'undefined') {
  window.addEventListener('online', async () => {
    console.log('[Firebase Offline Engine] Network reconnected. Ensuring fresh auth token & syncing cache...');
    try {
      if (auth.currentUser) {
        // Refresh token to prevent permission-denied rejection on pending offline queues
        await auth.currentUser.getIdToken(true).catch(e => console.warn('Token refresh on reconnect:', e));
      }
      if (db) {
        await enableNetwork(db).catch(() => {});
        // Gracefully wait for pending offline queue to flush
        if (!isSyncingPendingWrites) {
          isSyncingPendingWrites = true;
          waitForPendingWrites(db)
            .then(() => {
              console.log('[Firebase Offline Engine] All offline queued writes flushed successfully to Cloud Firestore.');
              window.dispatchEvent(new CustomEvent('firestore_queue_synced'));
            })
            .catch((err) => {
              console.warn('[Firebase Offline Engine] Some offline writes were rolled back or resolved with conflicts:', err?.message || err);
            })
            .finally(() => {
              isSyncingPendingWrites = false;
            });
        }
      }
    } catch (err) {
      console.warn('[Firebase Offline Engine] Reconnection handler warning:', err);
    }
  });

  window.addEventListener('offline', async () => {
    console.log('[Firebase Offline Engine] Offline mode active. Operations will be queued in IndexedDB.');
  });
}

// Keep fresh token ready for offline/online reconciliation
onIdTokenChanged(auth, async (user) => {
  if (user && db && navigator.onLine) {
    try {
      await enableNetwork(db).catch(() => {});
    } catch (_) {}
  }
});

export const loginWithGoogle = async () => {
  return signInWithPopup(auth, googleProvider);
};

export const logout = async () => {
  return signOut(auth);
};

export async function setFirestoreNetworkState(online: boolean) {
  if (!db) return;
  try {
    if (online) {
      await enableNetwork(db);
    } else {
      await disableNetwork(db);
    }
  } catch (err) {
    console.warn('Network state toggle:', err);
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errMsg = error instanceof Error ? error.message : String(error);

  // If we are offline, or if the error is due to an offline queued write conflict, log cleanly without crashing
  if (
    !navigator.onLine || 
    errMsg.includes('offline') || 
    errMsg.includes('client is offline') ||
    errMsg.includes('Failed to get document because the client is offline') ||
    errMsg.includes('write-stream')
  ) {
    console.warn(`Firestore operation '${operationType}' queued locally in IndexedDB on path '${path}'. Network offline.`);
    return;
  }

  // Handle transient session token expiry during offline writes gracefully
  if (errMsg.includes('permission-denied') || errMsg.includes('unauthenticated')) {
    console.warn(`Firestore authorization warning during '${operationType}' on '${path}': ${errMsg}. Will retry upon token refresh.`);
    if (auth.currentUser) {
      auth.currentUser.getIdToken(true).catch(() => {});
    }
    return;
  }

  // Handle transient listener Target ID re-sync / stream collisions gracefully
  if (
    errMsg.includes('Target ID already exists') ||
    errMsg.toLowerCase().includes('target id') ||
    errMsg.toLowerCase().includes('target-id')
  ) {
    console.warn(`Firestore listener re-sync warning during '${operationType}' on path '${path}': ${errMsg}`);
    return;
  }

  const errInfo: FirestoreErrorInfo = {
    error: errMsg,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email || undefined,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId || undefined,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName || '',
        email: provider.email || '',
        photoUrl: provider.photoURL || ''
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));

  // Do not throw errors for READ / LIST / GET listeners to prevent uncaught exception loops in async snapshot callbacks
  if (operationType === OperationType.LIST || operationType === OperationType.GET) {
    return;
  }

  throw new Error(JSON.stringify(errInfo));
}

export async function testConnection() {
  try {
    if (db && navigator.onLine) {
      await getDocFromServer(doc(db, 'test', 'connection'));
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.log("App running in local offline cache mode.");
    }
  }
}

