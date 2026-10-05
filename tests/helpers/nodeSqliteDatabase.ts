import type { SqlDatabase, SqlValue } from '@/db/types';

type NodeSqlite = typeof import('node:sqlite');

/** Node's built-in SQLite (Node ≥ 22.5). Returns null on older Node so DB tests can be skipped. */
export function loadNodeSqlite(): NodeSqlite | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('node:sqlite') as NodeSqlite;
  } catch {
    return null;
  }
}

/** Adapts an in-memory node:sqlite database to the app's SqlDatabase interface. */
export function createTestDatabase(sqlite: NodeSqlite): SqlDatabase & { close: () => void } {
  const db = new sqlite.DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON');
  const normalize = <T>(row: unknown): T => ({ ...(row as object) }) as T;

  return {
    async execAsync(sql) {
      db.exec(sql);
    },
    async runAsync(sql, params: SqlValue[] = []) {
      const result = db.prepare(sql).run(...params);
      return { changes: Number(result.changes), lastInsertRowId: Number(result.lastInsertRowid) };
    },
    async getAllAsync<T>(sql: string, params: SqlValue[] = []) {
      return db
        .prepare(sql)
        .all(...params)
        .map((row) => normalize<T>(row));
    },
    async getFirstAsync<T>(sql: string, params: SqlValue[] = []) {
      const row = db.prepare(sql).get(...params);
      return row === undefined ? null : normalize<T>(row);
    },
    async withTransactionAsync(task) {
      db.exec('BEGIN');
      try {
        await task();
        db.exec('COMMIT');
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    },
    close: () => db.close(),
  };
}
