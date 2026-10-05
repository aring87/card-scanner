/** @jest-environment node */
import { migrate, SCHEMA_VERSION } from '@/db/migrations';
import { seedDevelopmentData } from '@/db/seed';
import { TOPPS_FLAGSHIP_FOOTBALL_2026_ID } from '@/db/seed/toppsFlagshipFootball2026';
import type { SqlDatabase } from '@/db/types';
import type { CardScan } from '@/models';
import { createRepositories, type Repositories } from '@/repositories';

import { createTestDatabase, loadNodeSqlite } from './helpers/nodeSqliteDatabase';

const sqlite = loadNodeSqlite();
const describeDb = sqlite ? describe : describe.skip;
if (!sqlite) {
  console.warn('Skipping repository tests: node:sqlite requires Node 22.5 or newer.');
}

function makeScan(id: string, createdAt: string, overrides: Partial<CardScan> = {}): CardScan {
  return {
    id,
    createdAt,
    frontImageUri: `doc:scans/${id}/front.jpg`,
    backImageUri: null,
    tiltCaptureUri: null,
    detectedIdentity: { playerName: `Player ${id}`, cardNumber: '101', productId: TOPPS_FLAGSHIP_FOOTBALL_2026_ID },
    detectedVariation: {
      variationId: `${TOPPS_FLAGSHIP_FOOTBALL_2026_ID}:base`,
      name: 'Base',
      confidence: 0.7,
      evidence: ['x'],
      missingEvidence: [],
      conflictingEvidence: [],
    },
    serialNumber: null,
    confidence: 0.65,
    evidence: ['card number matched'],
    alternatives: [],
    captureRequests: [],
    recognitionMode: 'mock',
    isSimulated: true,
    userConfirmed: false,
    userCorrected: false,
    correction: null,
    ...overrides,
  };
}

describeDb('database + repositories', () => {
  let db: SqlDatabase & { close: () => void };
  let repos: Repositories;

  beforeEach(async () => {
    db = createTestDatabase(sqlite!);
    await migrate(db);
    await seedDevelopmentData(db);
    repos = createRepositories(db);
  });

  afterEach(() => db.close());

  describe('migrations', () => {
    it('records the schema version and is idempotent', async () => {
      expect(await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version')).toEqual({
        user_version: SCHEMA_VERSION,
      });
      await expect(migrate(db)).resolves.toEqual({ from: SCHEMA_VERSION, to: SCHEMA_VERSION });
    });
  });

  describe('seed', () => {
    it('creates the development product and its placeholder variations once', async () => {
      await seedDevelopmentData(db); // second run must not duplicate
      const product = await repos.products.getById(TOPPS_FLAGSHIP_FOOTBALL_2026_ID);
      expect(product).toMatchObject({ year: 2026, name: 'Topps Flagship Football', verificationStatus: 'unverified' });
      const variations = await repos.variations.listByProduct(TOPPS_FLAGSHIP_FOOTBALL_2026_ID);
      expect(variations.map((v) => v.name)).toEqual([
        'Base',
        'Holo Foil',
        'Diamante Foil',
        'Football Leather Foil',
        'Crackle Foil',
        'Pink',
        'Blue',
        'Green',
        'Gold',
        'Orange',
        'Black',
        'Red',
        'FoilFractor',
      ]);
      expect(variations.every((v) => v.verificationStatus === 'unverified')).toBe(true);
    });

    it('does not overwrite locally edited variations', async () => {
      const [base] = await repos.variations.listByProduct(TOPPS_FLAGSHIP_FOOTBALL_2026_ID);
      await repos.variations.upsert({ ...base!, notes: 'edited' });
      await seedDevelopmentData(db);
      expect((await repos.variations.getById(base!.id))?.notes).toBe('edited');
    });

    it('refuses to mark a variation verified without a source', async () => {
      const [base] = await repos.variations.listByProduct(TOPPS_FLAGSHIP_FOOTBALL_2026_ID);
      await expect(repos.variations.upsert({ ...base!, verificationStatus: 'verified' })).rejects.toThrow('source');
    });
  });

  describe('scans', () => {
    it('round-trips a scan including JSON columns', async () => {
      const scan = makeScan('s1', '2026-10-05T10:00:00.000Z', {
        serialNumber: {
          raw: '23/50',
          normalized: '23/50',
          number: 23,
          printRun: 50,
          printedDigits: 2,
          isOneOfOne: false,
          confidence: 0.95,
        },
        captureRequests: [{ side: 'tilt', region: 'lower-right', instruction: 'Tilt it.', reason: 'Because' }],
      });
      await repos.scans.create(scan);
      expect(await repos.scans.getById('s1')).toEqual(scan);
      expect(await repos.scans.getById('missing')).toBeNull();
    });

    it('lists newest first and counts', async () => {
      await repos.scans.create(makeScan('old', '2026-10-01T10:00:00.000Z'));
      await repos.scans.create(makeScan('new', '2026-10-05T10:00:00.000Z'));
      expect((await repos.scans.list()).map((s) => s.id)).toEqual(['new', 'old']);
      expect(await repos.scans.count()).toBe(2);
    });

    it('stores corrections alongside the original prediction', async () => {
      await repos.scans.create(makeScan('s1', '2026-10-05T10:00:00.000Z'));
      await repos.scans.applyCorrection('s1', {
        correctedAt: '2026-10-05T11:00:00.000Z',
        identity: { playerName: 'Real Player' },
        variationId: `${TOPPS_FLAGSHIP_FOOTBALL_2026_ID}:gold`,
        variationName: 'Gold',
        serialNumber: null,
      });
      const scan = await repos.scans.getById('s1');
      expect(scan).toMatchObject({ userCorrected: true, userConfirmed: true });
      expect(scan?.correction?.variationName).toBe('Gold');
      expect(scan?.detectedVariation?.name).toBe('Base');
    });

    it('rejects invalid scans before writing', async () => {
      await expect(repos.scans.create(makeScan('bad', 'not-a-date'))).rejects.toThrow();
      expect(await repos.scans.count()).toBe(0);
    });
  });

  describe('collection', () => {
    it('adds, lists, fetches and removes cards', async () => {
      await repos.scans.create(makeScan('a', '2026-10-01T10:00:00.000Z'));
      await repos.scans.create(makeScan('b', '2026-10-02T10:00:00.000Z'));

      const itemA = await repos.collection.add('a');
      const itemB = await repos.collection.add('b', 'PSA candidate');
      expect(await repos.collection.count()).toBe(2);

      const entries = await repos.collection.list();
      expect(entries.map((e) => e.scanId).sort()).toEqual(['a', 'b']);
      const detail = await repos.collection.getById(itemB.id);
      expect(detail).toMatchObject({ scanId: 'b', notes: 'PSA candidate', scan: { id: 'b' } });

      await repos.collection.remove(itemA.id);
      expect(await repos.collection.count()).toBe(1);
      expect(await repos.collection.getById(itemA.id)).toBeNull();
      // Removing from the collection keeps the scan in history.
      expect(await repos.scans.getById('a')).not.toBeNull();
    });

    it('is idempotent per scan', async () => {
      await repos.scans.create(makeScan('a', '2026-10-01T10:00:00.000Z'));
      const first = await repos.collection.add('a');
      const second = await repos.collection.add('a');
      expect(second.id).toBe(first.id);
      expect(await repos.collection.count()).toBe(1);
    });

    it('cascades when the scan is deleted', async () => {
      await repos.scans.create(makeScan('a', '2026-10-01T10:00:00.000Z'));
      await repos.collection.add('a');
      await repos.scans.delete('a');
      expect(await repos.collection.count()).toBe(0);
    });

    it('rejects items for unknown scans', async () => {
      await expect(repos.collection.add('nope')).rejects.toThrow();
    });
  });
});
