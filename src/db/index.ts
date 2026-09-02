import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.ts';

declare global {
  var _postgresPool: Pool | undefined;
}

export const DEFAULT_NEON_URL =
  'postgresql://neondb_owner:npg_pRLUnPEiv96b@ep-late-rice-ayyenzvz-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require';

export const createPool = (customUrl?: string) => {
  if (customUrl) {
    if (global._postgresPool) {
      try {
        global._postgresPool.end().catch(() => {});
      } catch {}
    }
    process.env.DATABASE_URL = customUrl;
    global._postgresPool = new Pool({
      connectionString: customUrl,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 15000,
      ssl: customUrl.includes('sslmode=require') || customUrl.includes('ssl=true') || customUrl.includes('neon.tech')
        ? { rejectUnauthorized: false }
        : undefined,
    });
    return global._postgresPool;
  }

  if (!global._postgresPool) {
    const databaseUrl = process.env.DATABASE_URL || DEFAULT_NEON_URL;

    const config = {
      connectionString: databaseUrl,
      max: 20, // robust pool size for persistent production servers
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 15000,
      ssl: databaseUrl.includes('sslmode=require') || databaseUrl.includes('ssl=true') || databaseUrl.includes('neon.tech')
        ? { rejectUnauthorized: false }
        : undefined,
    };

    global._postgresPool = new Pool(config);

    global._postgresPool.on('error', (err) => {
      console.error('Unexpected error on idle SQL pool client:', err);
    });
  }
  return global._postgresPool;
};

let pool = createPool();

export let db = drizzle(pool, { schema });

export async function testConnection(customUrl?: string): Promise<{
  success: boolean;
  type: string;
  latencyMs?: number;
  message?: string;
  tablesCount?: number;
}> {
  const start = Date.now();
  let testPool: Pool | null = null;
  try {
    if (customUrl) {
      testPool = new Pool({
        connectionString: customUrl,
        connectionTimeoutMillis: 8000,
        ssl: customUrl.includes('sslmode=require') || customUrl.includes('ssl=true') || customUrl.includes('neon.tech')
          ? { rejectUnauthorized: false }
          : undefined,
      });
      const client = await testPool.connect();
      await client.query('SELECT 1;');
      client.release();
      await testPool.end();
      const latencyMs = Date.now() - start;
      const type = customUrl.includes('neon.tech') ? 'Neon (Serverless PostgreSQL)' : 'PostgreSQL';
      return { success: true, type, latencyMs, message: 'الاتصال ناجح بقاعدة بيانات Neon' };
    } else {
      const activePool = createPool();
      const client = await activePool.connect();
      const res = await client.query("SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';");
      client.release();
      const latencyMs = Date.now() - start;
      const isNeon = (process.env.DATABASE_URL || '').includes('neon.tech');
      const type = isNeon ? 'Neon (Serverless PostgreSQL)' : 'Google Cloud SQL (PostgreSQL)';
      return {
        success: true,
        type,
        latencyMs,
        tablesCount: parseInt(res.rows[0]?.count || '0', 10),
        message: 'الاتصال السحابي نشط ويعمل بكفاءة',
      };
    }
  } catch (err: any) {
    if (testPool) {
      try {
        await testPool.end();
      } catch {}
    }
    return {
      success: false,
      type: customUrl?.includes('neon.tech') ? 'Neon' : 'PostgreSQL',
      latencyMs: Date.now() - start,
      message: err?.message || 'فشل الاتصال بقاعدة البيانات',
    };
  }
}

export function switchDatabaseUrl(neonUrl: string): { success: boolean; message: string } {
  try {
    pool = createPool(neonUrl);
    db = drizzle(pool, { schema });
    return { success: true, message: 'تم تحويل الاتصال إلى قاعدة بيانات Neon بنجاح' };
  } catch (err: any) {
    return { success: false, message: err?.message || 'فشل تبديل قاعدة البيانات' };
  }
}

