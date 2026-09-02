import { neon, NeonQueryFunction } from '@neondatabase/serverless';
import { DatabaseState } from '../types';

export const NEON_CONNECTION_STRING =
  'postgresql://neondb_owner:npg_pRLUnPEiv96b@ep-late-rice-ayyenzvz-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require';

// Helper to get active connection string (from local storage if overridden, or default)
export function getActiveNeonConnectionString(): string {
  try {
    const custom = localStorage.getItem('zakirly_neon_connection_string');
    if (custom && custom.trim().startsWith('postgres')) {
      return custom.trim();
    }
  } catch {}
  return NEON_CONNECTION_STRING;
}

export function setActiveNeonConnectionString(connStr: string | null): void {
  try {
    if (connStr && connStr.trim().startsWith('postgres')) {
      localStorage.setItem('zakirly_neon_connection_string', connStr.trim());
    } else {
      localStorage.removeItem('zakirly_neon_connection_string');
    }
  } catch {}
}

let cachedSql: NeonQueryFunction<false, false> | null = null;
let currentConnUrl = '';

function getSql(): NeonQueryFunction<false, false> {
  const activeUrl = getActiveNeonConnectionString();
  if (!cachedSql || currentConnUrl !== activeUrl) {
    currentConnUrl = activeUrl;
    cachedSql = neon(activeUrl);
  }
  return cachedSql;
}

/**
 * Fetch the latest state directly from Neon Database over HTTPS
 */
export async function fetchDirectFromNeon(): Promise<{
  success: boolean;
  db?: DatabaseState;
  version?: number;
  updatedAt?: string;
  error?: string;
}> {
  try {
    const sql = getSql();
    const rows = await sql`
      SELECT key, updated_at, value
      FROM app_state_store
      WHERE key = 'main_database_state'
      LIMIT 1;
    `;

    if (rows && rows.length > 0 && rows[0].value) {
      const db = rows[0].value as DatabaseState;
      const ver = Number((db as any)?.dataVersion) || 1;
      return {
        success: true,
        db,
        version: ver,
        updatedAt: rows[0].updated_at,
      };
    }

    return {
      success: false,
      error: 'No database state row found in Neon',
    };
  } catch (err: any) {
    console.warn('[Neon Direct] Fetch error:', err);
    return {
      success: false,
      error: err?.message || 'Failed to fetch from Neon',
    };
  }
}

/**
 * Check only the version/timestamp from Neon (ultra-lightweight for background polling)
 */
export async function checkNeonVersion(): Promise<{
  success: boolean;
  version?: number;
  updatedAt?: string;
  error?: string;
}> {
  try {
    const sql = getSql();
    const rows = await sql`
      SELECT updated_at, (value->>'dataVersion')::int as version
      FROM app_state_store
      WHERE key = 'main_database_state'
      LIMIT 1;
    `;

    if (rows && rows.length > 0) {
      return {
        success: true,
        version: Number(rows[0].version) || 1,
        updatedAt: rows[0].updated_at,
      };
    }
    return { success: false };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}

/**
 * Save state directly to Neon Database over HTTPS
 */
export async function saveDirectToNeon(db: DatabaseState): Promise<{
  success: boolean;
  error?: string;
  updatedAt?: string;
}> {
  try {
    const sql = getSql();
    const serialized = JSON.stringify(db);
    
    // Ensure table exists
    await sql`
      CREATE TABLE IF NOT EXISTS app_state_store (
        key TEXT PRIMARY KEY,
        value JSONB NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `;

    // Upsert the state
    const res = await sql`
      INSERT INTO app_state_store (key, value, updated_at)
      VALUES ('main_database_state', ${serialized}::jsonb, NOW())
      ON CONFLICT (key) DO UPDATE
      SET value = EXCLUDED.value, updated_at = NOW()
      RETURNING updated_at;
    `;

    return {
      success: true,
      updatedAt: res[0]?.updated_at,
    };
  } catch (err: any) {
    console.error('[Neon Direct] Save error:', err);
    return {
      success: false,
      error: err?.message || 'Failed to save to Neon',
    };
  }
}

/**
 * Test Neon Connection and measure latency
 */
export async function testDirectNeonConnection(customConnStr?: string): Promise<{
  success: boolean;
  latencyMs?: number;
  message?: string;
}> {
  const start = Date.now();
  try {
    const targetUrl = customConnStr || getActiveNeonConnectionString();
    const sql = neon(targetUrl);
    await sql`SELECT NOW();`;
    const latencyMs = Date.now() - start;
    return {
      success: true,
      latencyMs,
      message: 'متصل بنجاح بقاعدة بيانات Neon',
    };
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'فشل الاتصال بـ Neon',
    };
  }
}
