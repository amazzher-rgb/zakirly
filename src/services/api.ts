import { DatabaseState, RealtimeEvent, SystemKPIs } from '../types';

export async function fetchState(): Promise<{
  db: DatabaseState;
  kpis: SystemKPIs;
  version?: number;
  lastSavedAt?: string;
}> {
  try {
    const res = await fetch(`/api/state?t=${Date.now()}`);
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
    const res = await fetch(`/api/state/version?t=${Date.now()}`);
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
  const res = await fetch('/api/state/sync', {
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
      eventSource = new EventSource('/api/realtime');

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

export async function completeSessionWorkflow(payload: {
  sessionId: string;
  attendanceStatus?: string;
  notes?: string;
  performedBy?: string;
}) {
  const res = await fetch('/api/workflows/complete-session', {
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
  const res = await fetch('/api/workflows/process-payment', {
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
  const res = await fetch('/api/workflows/convert-trial', {
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
  const res = await fetch('/api/workflows/run-payroll', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function createStudentApi(studentData: any) {
  const res = await fetch('/api/students', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(studentData),
  });
  return res.json();
}

export async function createTeacherApi(teacherData: any) {
  const res = await fetch('/api/teachers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(teacherData),
  });
  return res.json();
}

export async function createSessionApi(sessionData: any) {
  const res = await fetch('/api/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sessionData),
  });
  return res.json();
}

export async function resetDatabaseApi(performedBy?: string) {
  const res = await fetch('/api/state/reset', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ performedBy }),
  });
  return res.json();
}

export async function importBackupApi(backupJson: any) {
  const res = await fetch('/api/backup/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(backupJson),
  });
  return res.json();
}
