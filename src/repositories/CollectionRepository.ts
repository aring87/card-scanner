import type { SqlDatabase } from '@/db/types';
import { CollectionItemSchema, type CollectionEntry, type CollectionItem } from '@/models';
import { createId } from '@/utils/id';

import { rowToScan, type ScanRow } from './ScanRepository';

type CollectionItemRow = { id: string; scan_id: string; added_at: string; notes: string | null };
type CollectionJoinRow = ScanRow & { item_id: string; item_added_at: string; item_notes: string | null };

const toItem = (row: CollectionItemRow): CollectionItem =>
  CollectionItemSchema.parse({ id: row.id, scanId: row.scan_id, addedAt: row.added_at, notes: row.notes });

const toEntry = (row: CollectionJoinRow): CollectionEntry => ({
  ...CollectionItemSchema.parse({
    id: row.item_id,
    scanId: row.id,
    addedAt: row.item_added_at,
    notes: row.item_notes,
  }),
  scan: rowToScan(row),
});

const JOIN_SELECT = `
  SELECT s.*, ci.id AS item_id, ci.added_at AS item_added_at, ci.notes AS item_notes
  FROM collection_items ci
  JOIN scans s ON s.id = ci.scan_id`;

export class CollectionRepository {
  constructor(
    private readonly db: SqlDatabase,
    private readonly now: () => Date = () => new Date(),
  ) {}

  /** Adds a scan to the collection. Idempotent: adding the same scan twice returns the existing item. */
  async add(scanId: string, notes: string | null = null): Promise<CollectionItem> {
    const existing = await this.getByScanId(scanId);
    if (existing) return existing;
    const item = CollectionItemSchema.parse({
      id: createId('item'),
      scanId,
      addedAt: this.now().toISOString(),
      notes,
    });
    await this.db.runAsync('INSERT INTO collection_items (id, scan_id, added_at, notes) VALUES (?, ?, ?, ?)', [
      item.id,
      item.scanId,
      item.addedAt,
      item.notes,
    ]);
    return item;
  }

  async getByScanId(scanId: string): Promise<CollectionItem | null> {
    const row = await this.db.getFirstAsync<CollectionItemRow>('SELECT * FROM collection_items WHERE scan_id = ?', [
      scanId,
    ]);
    return row ? toItem(row) : null;
  }

  /** Newest first. */
  async list(): Promise<CollectionEntry[]> {
    const rows = await this.db.getAllAsync<CollectionJoinRow>(`${JOIN_SELECT} ORDER BY ci.added_at DESC, ci.id DESC`);
    return rows.map(toEntry);
  }

  async getById(id: string): Promise<CollectionEntry | null> {
    const row = await this.db.getFirstAsync<CollectionJoinRow>(`${JOIN_SELECT} WHERE ci.id = ?`, [id]);
    return row ? toEntry(row) : null;
  }

  async remove(id: string): Promise<void> {
    await this.db.runAsync('DELETE FROM collection_items WHERE id = ?', [id]);
  }

  async count(): Promise<number> {
    const row = await this.db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM collection_items');
    return row?.n ?? 0;
  }
}
