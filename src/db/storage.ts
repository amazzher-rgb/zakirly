import { db } from './index.ts';
import { appStateStore } from './schema.ts';
import { eq } from 'drizzle-orm';
import { DatabaseState } from '../types/index.ts';

export async function loadStateFromSql(): Promise<DatabaseState | null> {
  try {
    const result = await db
      .select()
      .from(appStateStore)
      .where(eq(appStateStore.key, 'main_database_state'))
      .limit(1);

    if (result.length > 0 && result[0].value) {
      return result[0].value as DatabaseState;
    }
    return null;
  } catch (error) {
    console.warn('Could not load state from SQL table, using local cache:', error);
    return null;
  }
}

export async function saveStateToSql(state: DatabaseState): Promise<boolean> {
  try {
    await db
      .insert(appStateStore)
      .values({
        key: 'main_database_state',
        value: state,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: appStateStore.key,
        set: {
          value: state,
          updatedAt: new Date(),
        },
      });
    return true;
  } catch (error) {
    console.warn('Could not save state to SQL table, preserved locally:', error);
    return false;
  }
}
