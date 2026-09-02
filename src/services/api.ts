import { DatabaseState, RealtimeEvent, SystemKPIs } from '../types';

export const CLOUD_BACKEND_URL = 'https://ais-pre-uhw3xzpve2e5yzykao4yed-534567286396.europe-west2.run.app';

export function getApiBaseUrl(): string {
  try {
    const custom = localStorage.getItem('zakirly_backend_api_url');
    if (custom && custom.trim()) {
      return custom.trim().replace(/\/+$/, '');
    }
  } catch {}

  // If in browser:
  if (typeof window !== 'undefined') {
    // If running on GitHub Pages, pages.dev, or local file, route to the cloud backend
    if (
      window.location.hostname.includes('github.io') ||
      window.location.hostname.includes('pages.dev') ||
      window.location.protocol === 'file:'
    ) {
      return CLOUD_BACKEND_URL;
    }
  }

  // Same origin (e.g. running directly on Cloud Run or dev proxy)
  return '';
}

export function setCustomBackendUrl(url: string | null): void {
  try {
    if (url && url.trim()) {
      localStorage.setItem('zakirly_backend_api_url', url.trim());
    } else {
      localStorage.removeItem('zakirly_backend_api_url');
    }
  } catch {}
}

export async function fetchState(): Promise<{
  db: DatabaseState;
  kpis: SystemKPIs;
  version?: number;
  lastSavedAt?: string;
}> {
  try {
    const base = getApiBaseUrl();
    const res = await fetch(`${base}/api/state?t=${Date.now()}`);
    if (!res.ok) throw new Error('Failed to fetch state');
    const data = await res.json();
    return {
      db: data.db,
      kpis: data.kpis,
      version: data.version,
      lastSavedAt: data.lastSavedAt,
    };
  } catch (err) {
    console.warn('Backend server fetch failed, returning local state fallback', err);
    throw err;
  }
}

export async function fetchServerVersion(): Promise<{
  version: number;
  lastSavedAt: string;
} | null> {
  try {
    const base = getApiBaseUrl();
    const res = await fetch(`${base}/api/state/version?t=${Date.now()}`);
    if (!res.ok) return null;
    const data = await res.json();
    return {
      version: data.version,
      lastSavedAt: data.lastSavedAt,
    };
  } catch {
    return null;
  }
}

export async function syncStateApi(
  clientDb: DatabaseState,
  performedBy?: string
): Promise<{
  success: boolean;
  db?: DatabaseState;
  kpis?: SystemKPIs;
  version?: number;
}> {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/api/state/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ db: clientDb, performedBy }),
  });
  return res.json();
}

export function subscribeToRealtime(
  onEvent: (event: any) => void
): () => void {
  let eventSource: EventSource | null = null;
  let isClosed = false;
  let reconnectTimeout: any = null;

  const connect = () => {
    if (isClosed) return;
    try {
      const base = getApiBaseUrl();
      eventSource = new EventSource(`${base}/api/realtime`);

      eventSource.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          onEvent(data);
        } catch (err) {
          // ignore keepalive or parse error
        }
      };

      eventSource.onopen = () => {
        onEvent({ type: 'CONNECTED' });
      };

      eventSource.onerror = () => {
        if (eventSource) {
          eventSource.close();
          eventSource = null;
        }
        if (!isClosed) {
          reconnectTimeout = setTimeout(connect, 3000);
        }
      };
    } catch (err) {
      if (!isClosed) {
        reconnectTimeout = setTimeout(connect, 4000);
      }
    }
  };

  connect();

  return () => {
    isClosed = true;
    if (reconnectTimeout) clearTimeout(reconnectTimeout);
    if (eventSource) {
      eventSource.close();
    }
  };
}

export async function fetchSqlStatus(): Promise<{
  success: boolean;
  database?: string;
  status?: string;
  latencyMs?: number;
  tablesCount?: number;
  message?: string;
}> {
  try {
    const base = getApiBaseUrl();
    const res = await fetch(`${base}/api/sql/status?t=${Date.now()}`);
    return await res.json();
  } catch (err: any) {
    return {
      success: false,
      database: 'Cloud SQL / Neon',
      status: 'error',
      message: err.message,
    };
  }
}

export async function testNeonConnectionApi(connectionString: string): Promise<{
  success: boolean;
  type?: string;
  latencyMs?: number;
  message?: string;
}> {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/api/db/test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ connectionString }),
  });
  return res.json();
}

export async function switchNeonDatabaseApi(connectionString: string): Promise<{
  success: boolean;
  type?: string;
  message?: string;
}> {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/api/db/switch-neon`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ connectionString }),
  });
  return res.json();
}

export async function completeSessionWorkflow(payload: {
  sessionId: string;
  attendanceStatus?: string;
  notes?: string;
  performedBy?: string;
}) {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/api/workflows/complete-session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function processPaymentWorkflow(payload: {
  invoiceId: string;
  paymentAmount: number;
  paymentMethod?: string;
  notes?: string;
  performedBy?: string;
}) {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/api/workflows/process-payment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function convertTrialWorkflow(payload: {
  trialId: string;
  packageCourseId?: string;
  totalSessions?: number;
  price?: number;
  paidAmount?: number;
  currency?: string;
  performedBy?: string;
}) {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/api/workflows/convert-trial`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function runPayrollWorkflow(payload: {
  month: number;
  year: number;
  performedBy?: string;
}) {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/api/workflows/run-payroll`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function createStudentApi(studentData: any) {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/api/students`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(studentData),
  });
  return res.json();
}

export async function createTeacherApi(teacherData: any) {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/api/teachers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(teacherData),
  });
  return res.json();
}

export async function createSessionApi(sessionData: any) {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/api/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sessionData),
  });
  return res.json();
}

export async function resetDatabaseApi(performedBy?: string) {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/api/state/reset`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ performedBy }),
  });
  return res.json();
}

export async function importBackupApi(backupJson: any) {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/api/backup/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(backupJson),
  });
  return res.json();
}
