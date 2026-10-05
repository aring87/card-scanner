import type { SqlDatabase } from './types';

/**
 * Ordered schema migrations. NEVER edit a migration that has shipped; append a new one.
 * The applied version is tracked with SQLite's `PRAGMA user_version`.
 */
export const MIGRATIONS: readonly string[] = [
  // v1 — initial schema
  `
  CREATE TABLE products (
    id TEXT PRIMARY KEY NOT NULL,
    year INTEGER NOT NULL,
    manufacturer TEXT NOT NULL,
    name TEXT NOT NULL,
    sport TEXT NOT NULL,
    verification_status TEXT NOT NULL DEFAULT 'unverified',
    notes TEXT
  );

  CREATE TABLE variations (
    id TEXT PRIMARY KEY NOT NULL,
    product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    serial_numbered INTEGER,
    print_run INTEGER,
    color TEXT,
    foil_type TEXT,
    texture_type TEXT,
    exclusivity TEXT,
    visual_signatures TEXT NOT NULL DEFAULT '[]',
    identification_rules TEXT NOT NULL DEFAULT '[]',
    verification_status TEXT NOT NULL DEFAULT 'unverified',
    source TEXT,
    notes TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    UNIQUE (product_id, name)
  );
  CREATE INDEX idx_variations_product ON variations (product_id, sort_order);

  CREATE TABLE cards (
    id TEXT PRIMARY KEY NOT NULL,
    product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    manufacturer TEXT NOT NULL,
    product TEXT NOT NULL,
    set_name TEXT NOT NULL,
    subset_name TEXT,
    player_name TEXT NOT NULL,
    team TEXT,
    card_number TEXT NOT NULL,
    rookie INTEGER NOT NULL DEFAULT 0,
    sport TEXT NOT NULL
  );
  CREATE INDEX idx_cards_product_number ON cards (product_id, card_number);

  CREATE TABLE scans (
    id TEXT PRIMARY KEY NOT NULL,
    created_at TEXT NOT NULL,
    product_id TEXT REFERENCES products(id) ON DELETE SET NULL,
    front_image_uri TEXT,
    back_image_uri TEXT,
    tilt_capture_uri TEXT,
    detected_identity TEXT NOT NULL,
    detected_variation TEXT,
    detected_variation_id TEXT,
    serial_number TEXT,
    confidence REAL NOT NULL,
    evidence TEXT NOT NULL DEFAULT '[]',
    alternatives TEXT NOT NULL DEFAULT '[]',
    capture_requests TEXT NOT NULL DEFAULT '[]',
    recognition_mode TEXT NOT NULL,
    is_simulated INTEGER NOT NULL DEFAULT 0,
    user_confirmed INTEGER NOT NULL DEFAULT 0,
    user_corrected INTEGER NOT NULL DEFAULT 0,
    correction TEXT
  );
  CREATE INDEX idx_scans_created_at ON scans (created_at DESC);

  CREATE TABLE collection_items (
    id TEXT PRIMARY KEY NOT NULL,
    scan_id TEXT NOT NULL UNIQUE REFERENCES scans(id) ON DELETE CASCADE,
    added_at TEXT NOT NULL,
    notes TEXT
  );
  `,
];

export const SCHEMA_VERSION = MIGRATIONS.length;

export async function migrate(db: SqlDatabase): Promise<{ from: number; to: number }> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const from = row?.user_version ?? 0;
  if (from > SCHEMA_VERSION) {
    throw new Error(`Database schema v${from} is newer than this app supports (v${SCHEMA_VERSION}).`);
  }
  for (let version = from; version < SCHEMA_VERSION; version++) {
    const sql = MIGRATIONS[version];
    if (sql === undefined) break;
    await db.withTransactionAsync(async () => {
      await db.execAsync(sql);
      // PRAGMA does not accept bound parameters; `version` is a trusted integer.
      await db.execAsync(`PRAGMA user_version = ${version + 1}`);
    });
  }
  return { from, to: SCHEMA_VERSION };
}
