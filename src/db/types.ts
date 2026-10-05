export type SqlValue = string | number | null;

export type SqlRunResult = { changes: number; lastInsertRowId: number };

/**
 * The minimal async SQL surface the repositories depend on. The app adapts expo-sqlite to it
 * (see client.ts); tests adapt Node's built-in sqlite. Keeping repositories off the concrete
 * driver lets them be unit-tested and lets us swap storage later without touching callers.
 */
export interface SqlDatabase {
  execAsync(sql: string): Promise<void>;
  runAsync(sql: string, params?: SqlValue[]): Promise<SqlRunResult>;
  getAllAsync<T>(sql: string, params?: SqlValue[]): Promise<T[]>;
  getFirstAsync<T>(sql: string, params?: SqlValue[]): Promise<T | null>;
  withTransactionAsync(task: () => Promise<void>): Promise<void>;
}
