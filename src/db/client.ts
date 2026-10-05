import * as SQLite from 'expo-sqlite';

import { migrate } from './migrations';
import { seedDevelopmentData } from './seed';
import type { SqlDatabase, SqlValue } from './types';

export const DATABASE_NAME = 'cardvariant.db';

/** Adapts expo-sqlite to the driver-agnostic SqlDatabase interface. */
export function adaptExpoDatabase(db: SQLite.SQLiteDatabase): SqlDatabase {
  return {
    execAsync: (sql) => db.execAsync(sql),
    runAsync: (sql, params = []) => db.runAsync(sql, params),
    getAllAsync: <T>(sql: string, params: SqlValue[] = []) => db.getAllAsync<T>(sql, params),
    getFirstAsync: <T>(sql: string, params: SqlValue[] = []) => db.getFirstAsync<T>(sql, params),
    withTransactionAsync: (task) => db.withTransactionAsync(task),
  };
}

/** Opens the on-device database, applies migrations and the development seed. */
export async function openAppDatabase(): Promise<SqlDatabase> {
  const native = await SQLite.openDatabaseAsync(DATABASE_NAME);
  await native.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  const db = adaptExpoDatabase(native);
  await migrate(db);
  await seedDevelopmentData(db);
  return db;
}
