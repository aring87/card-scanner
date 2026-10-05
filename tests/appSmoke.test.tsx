import { renderRouter, screen, testRouter, waitFor } from 'expo-router/testing-library';
import path from 'path';

import { migrate } from '@/db/migrations';
import { seedDevelopmentData } from '@/db/seed';
import { TOPPS_FLAGSHIP_FOOTBALL_2026_ID } from '@/db/seed/toppsFlagshipFootball2026';
import { createRecognitionPipeline, resultToScan } from '@/features/recognition';
import { createRepositories } from '@/repositories';

import { createTestDatabase, loadNodeSqlite } from './helpers/nodeSqliteDatabase';

/*
 * Boots the real routes against an in-memory SQLite database (the only native piece replaced),
 * to catch startup/render crashes that type-checking cannot.
 */

// The first render transforms every route, which is slow on a cold cache.
jest.setTimeout(30000);

const mockOpenAppDatabase = jest.fn();
jest.mock('@/db/client', () => ({ openAppDatabase: () => mockOpenAppDatabase() }));

const sqlite = loadNodeSqlite();
const describeApp = sqlite ? describe : describe.skip;
const APP_DIR = path.resolve(__dirname, '../src/app');

async function freshDatabase() {
  const db = createTestDatabase(sqlite!);
  await migrate(db);
  await seedDevelopmentData(db);
  mockOpenAppDatabase.mockResolvedValue(db);
  return db;
}

describeApp('app smoke test', () => {
  it('opens the database and renders the home screen', async () => {
    await freshDatabase();
    renderRouter(APP_DIR, { initialUrl: '/' });
    expect(await screen.findByText('Scan Card')).toBeTruthy();
    expect(screen.getByText('My Collection')).toBeTruthy();
    expect(screen.getByText('Scan History')).toBeTruthy();
    await waitFor(() => expect(screen.getByLabelText('Cards scanned: 0')).toBeTruthy());
  });

  it('shows empty states for collection and history', async () => {
    await freshDatabase();
    renderRouter(APP_DIR, { initialUrl: '/collection' });
    expect(await screen.findByText('No cards yet')).toBeTruthy();
    testRouter.push('/history');
    expect(await screen.findByText('No scans yet')).toBeTruthy();
  });

  it('renders review and variation results for a stored scan', async () => {
    const db = await freshDatabase();
    const repos = createRepositories(db);
    const result = await createRecognitionPipeline({
      mode: 'mock',
      mockScenarioId: 'leather-foil',
      variationSource: repos.variations,
    }).run({
      captures: { frontImageUri: 'file:///front.jpg', backImageUri: 'file:///back.jpg' },
      productHintId: TOPPS_FLAGSHIP_FOOTBALL_2026_ID,
    });
    await repos.scans.create(resultToScan('scan_1', new Date().toISOString(), { front: null, back: null }, result));

    renderRouter(APP_DIR, { initialUrl: '/scan/review?scanId=scan_1' });
    expect(await screen.findByText('Simulated result')).toBeTruthy();
    expect(screen.getByText('Confirm')).toBeTruthy();
    expect(screen.getAllByText('Football Leather Foil').length).toBeGreaterThan(0);

    testRouter.push('/scan/variations?scanId=scan_1');
    expect(await screen.findByText('POSSIBLE ALTERNATIVES')).toBeTruthy();
    expect(screen.getByText('NEED ANOTHER SCAN?')).toBeTruthy();
  });

  it('renders settings with the seeded product and mock scenarios', async () => {
    await freshDatabase();
    renderRouter(APP_DIR, { initialUrl: '/settings' });
    expect(await screen.findByText('RECOGNITION MODE')).toBeTruthy();
    expect(screen.getByText('Clear foil match')).toBeTruthy();
    await waitFor(() => expect(screen.getByLabelText('Variations: 13')).toBeTruthy());
    expect(screen.getByLabelText('Verified: 0')).toBeTruthy();
  });

  it('renders the scan screen without crashing', async () => {
    await freshDatabase();
    renderRouter(APP_DIR, { initialUrl: '/scan' });
    // Depending on the mocked permission state this is the camera UI or the permission prompt.
    await waitFor(() =>
      expect(screen.queryByText('Continue') ?? screen.queryByText('Camera access needed') ?? screen.queryByText('Checking camera permission…')).toBeTruthy(),
    );
  });

  it('shows an error state with retry when the database cannot open', async () => {
    mockOpenAppDatabase.mockRejectedValue(new Error('disk full'));
    renderRouter(APP_DIR, { initialUrl: '/' });
    expect(await screen.findByText('Could not open the card database')).toBeTruthy();
    expect(screen.getByText('disk full')).toBeTruthy();
    expect(screen.getByText('Try again')).toBeTruthy();
  });
});
