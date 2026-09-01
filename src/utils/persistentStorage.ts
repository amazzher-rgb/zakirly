import { DatabaseState } from '../types';
import { initialDatabaseState } from '../data/initialData';

const PRIMARY_STORAGE_KEY = 'zakirly_persistent_db_v3';
const BACKUP_STORAGE_KEY = 'zakirly_persistent_db_backup';
const LEGACY_STORAGE_KEY = 'zakirly_db_v2';
const IDB_NAME = 'ZakirlyPermanentDB';
const IDB_STORE = 'app_state';
const IDB_KEY = 'active_db';

// Open IndexedDB safely
function openIDB(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      resolve(null);
      return;
    }
    try {
      const request = window.indexedDB.open(IDB_NAME, 1);
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
        }
      };
      request.onsuccess = () => {
        resolve(request.result);
      };
      request.onerror = () => {
        console.warn('IndexedDB open error, falling back to localStorage');
        resolve(null);
      };
    } catch (e) {
      console.warn('IndexedDB exception', e);
      resolve(null);
    }
  });
}

// Save database to IndexedDB
export async function saveToIndexedDB(state: DatabaseState): Promise<boolean> {
  try {
    const idb = await openIDB();
    if (!idb) return false;
    return new Promise((resolve) => {
      const tx = idb.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      const req = store.put(state, IDB_KEY);
      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    });
  } catch (e) {
    console.warn('Failed to write state to IndexedDB', e);
    return false;
  }
}

// Load database from IndexedDB
export async function loadFromIndexedDB(): Promise<DatabaseState | null> {
  try {
    const idb = await openIDB();
    if (!idb) return null;
    return new Promise((resolve) => {
      const tx = idb.transaction(IDB_STORE, 'readonly');
      const store = tx.objectStore(IDB_STORE);
      const req = store.get(IDB_KEY);
      req.onsuccess = () => {
        const res = req.result;
        if (isValidDatabaseState(res)) {
          resolve(res);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch (e) {
    console.warn('Failed to read state from IndexedDB', e);
    return null;
  }
}

// Validate database state structure
export function isValidDatabaseState(obj: any): obj is DatabaseState {
  return (
    obj &&
    typeof obj === 'object' &&
    Array.isArray(obj.students) &&
    Array.isArray(obj.teachers) &&
    Array.isArray(obj.tenants)
  );
}

// Check if database contains user modifications beyond the factory initial template
export function hasUserModifications(db: DatabaseState | null): boolean {
  if (!db || typeof db !== 'object') return false;
  
  // 1. Explicit user modification flag
  if ((db as any)._userModified === true) return true;

  // 2. Data version incremented beyond initial 1
  if ((db as any).dataVersion && Number((db as any).dataVersion) > 1) return true;

  // 3. Check entity array lengths against initial factory template
  if (!Array.isArray(db.students) || !Array.isArray(db.teachers)) return false;
  if (db.students.length !== initialDatabaseState.students.length) return true;
  if (db.teachers.length !== initialDatabaseState.teachers.length) return true;
  if ((db.sessions || []).length !== (initialDatabaseState.sessions || []).length) return true;
  if ((db.invoices || []).length !== (initialDatabaseState.invoices || []).length) return true;
  if ((db.parents || []).length !== (initialDatabaseState.parents || []).length) return true;
  if ((db.subscriptions || []).length !== (initialDatabaseState.subscriptions || []).length) return true;
  if ((db.attendance || []).length !== (initialDatabaseState.attendance || []).length) return true;
  if ((db.users || []).length !== (initialDatabaseState.users || []).length) return true;
  if ((db.courseSubjects || []).length !== (initialDatabaseState.courseSubjects || []).length) return true;
  if ((db.trialLessons || []).length !== (initialDatabaseState.trialLessons || []).length) return true;
  if ((db.payrolls || []).length !== (initialDatabaseState.payrolls || []).length) return true;

  // 4. Check for newly created entity IDs
  const initialStudentIds = new Set(initialDatabaseState.students.map((s) => s.id));
  if (db.students.some((s) => !initialStudentIds.has(s.id))) return true;

  const initialTeacherIds = new Set(initialDatabaseState.teachers.map((t) => t.id));
  if (db.teachers.some((t) => !initialTeacherIds.has(t.id))) return true;

  const initialSessionIds = new Set((initialDatabaseState.sessions || []).map((s) => s.id));
  if ((db.sessions || []).some((s) => !initialSessionIds.has(s.id))) return true;

  const initialInvoiceIds = new Set((initialDatabaseState.invoices || []).map((i) => i.id));
  if ((db.invoices || []).some((i) => !initialInvoiceIds.has(i.id))) return true;

  const initialParentIds = new Set((initialDatabaseState.parents || []).map((p) => p.id));
  if ((db.parents || []).some((p) => !initialParentIds.has(p.id))) return true;

  // 5. Check for completed sessions or paid invoices that were not in initial template
  const hasCompletedSession = (db.sessions || []).some((s) => s.status === 'completed');
  const initialHasCompleted = (initialDatabaseState.sessions || []).some((s) => s.status === 'completed');
  if (hasCompletedSession !== initialHasCompleted) return true;

  const hasPaidInvoice = (db.invoices || []).some((i) => i.status === 'paid' || (i.paidAmount && i.paidAmount > 0));
  const initialHasPaid = (initialDatabaseState.invoices || []).some((i) => i.status === 'paid' || (i.paidAmount && i.paidAmount > 0));
  if (hasPaidInvoice !== initialHasPaid) return true;

  return false;
}

// Save permanent local state across all available browsers storage layers
export function savePermanentState(state: DatabaseState): void {
  if (!isValidDatabaseState(state)) return;

  try {
    const enriched: DatabaseState & { _userModified: boolean; lastSavedAt: string; dataVersion: number } = {
      ...state,
      _userModified: true,
      lastSavedAt: new Date().toISOString(),
      dataVersion: ((state as any).dataVersion || 1) + 1,
    };

    const serialized = JSON.stringify(enriched);

    // 1. Primary localStorage
    try {
      localStorage.setItem(PRIMARY_STORAGE_KEY, serialized);
    } catch (e) {
      console.warn('Primary localStorage quota exceeded or error', e);
    }

    // 2. Backup localStorage
    try {
      localStorage.setItem(BACKUP_STORAGE_KEY, serialized);
    } catch (e) {}

    // 3. SessionStorage fallback
    try {
      sessionStorage.setItem(PRIMARY_STORAGE_KEY, serialized);
    } catch (e) {}

    // 4. IndexedDB permanent async write (survives cache clear & has no 5MB limit)
    saveToIndexedDB(enriched).catch(() => {});
  } catch (err) {
    console.error('Error saving permanent state', err);
  }
}

// Load permanent state synchronously from local storage with multi-level fallbacks
export function loadPermanentState(): DatabaseState {
  try {
    // 1. Try primary storage key
    const primary = localStorage.getItem(PRIMARY_STORAGE_KEY);
    if (primary) {
      const parsed = JSON.parse(primary);
      if (isValidDatabaseState(parsed)) {
        return parsed;
      }
    }

    // 2. Try backup storage key
    const backup = localStorage.getItem(BACKUP_STORAGE_KEY);
    if (backup) {
      const parsed = JSON.parse(backup);
      if (isValidDatabaseState(parsed)) {
        return parsed;
      }
    }

    // 3. Try legacy storage key
    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacy) {
      const parsed = JSON.parse(legacy);
      if (isValidDatabaseState(parsed)) {
        // Upgrade legacy to v3
        savePermanentState(parsed);
        return parsed;
      }
    }

    // 4. Try sessionStorage
    const session = sessionStorage.getItem(PRIMARY_STORAGE_KEY);
    if (session) {
      const parsed = JSON.parse(session);
      if (isValidDatabaseState(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to load synchronous local state, using initial state', e);
  }

  const initial = JSON.parse(JSON.stringify(initialDatabaseState));
  (initial as any)._userModified = false;
  (initial as any).dataVersion = 1;
  return initial;
}

// Determine if local client state should be preserved and synced to a freshly started server
export function shouldPreserveClientState(
  clientDb: DatabaseState | null,
  serverDb: DatabaseState | null
): boolean {
  if (!clientDb || !isValidDatabaseState(clientDb)) return false;
  if (!serverDb || !isValidDatabaseState(serverDb)) return true;

  const clientHasMods = hasUserModifications(clientDb);
  const serverHasMods = hasUserModifications(serverDb);

  // If client has custom user records/modifications while server is at clean initial template:
  if (clientHasMods && !serverHasMods) {
    return true;
  }

  // If server has user modifications while client does not:
  if (!clientHasMods && serverHasMods) {
    return false;
  }

  // If neither has user modifications:
  if (!clientHasMods && !serverHasMods) {
    return false;
  }

  // If BOTH have user modifications, compare version and timestamps:
  const clientVer = Number((clientDb as any).dataVersion) || 0;
  const serverVer = Number((serverDb as any).dataVersion) || 0;

  if (clientVer !== serverVer && clientVer > 0 && serverVer > 0) {
    return clientVer > serverVer;
  }

  const clientTime = (clientDb as any).lastSavedAt ? new Date((clientDb as any).lastSavedAt).getTime() : 0;
  const serverTime = (serverDb as any).lastSavedAt ? new Date((serverDb as any).lastSavedAt).getTime() : 0;

  if (clientTime > 0 && serverTime > 0) {
    return clientTime > serverTime;
  }

  return false;
}
