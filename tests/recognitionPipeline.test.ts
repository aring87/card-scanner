import { TOPPS_FLAGSHIP_FOOTBALL_2026_ID, toppsFlagshipFootball2026Variations } from '@/db/seed/toppsFlagshipFootball2026';
import {
  createRecognitionPipeline,
  MOCK_SCENARIO_IDS,
  RecognitionError,
  RecognitionPipeline,
  resultToScan,
} from '@/features/recognition';
import { CardScanSchema } from '@/models';
import type { CaptureSet } from '@/features/recognition';

const variationSource = {
  listByProduct: async (productId: string) =>
    productId === TOPPS_FLAGSHIP_FOOTBALL_2026_ID ? toppsFlagshipFootball2026Variations : [],
};

const bothSides = { frontImageUri: 'file:///front.jpg', backImageUri: 'file:///back.jpg' };

async function runMock(scenario: (typeof MOCK_SCENARIO_IDS)[number], captures: CaptureSet = bothSides) {
  const pipeline = createRecognitionPipeline({ mode: 'mock', mockScenarioId: scenario, variationSource });
  return pipeline.run({ captures, productHintId: TOPPS_FLAGSHIP_FOOTBALL_2026_ID });
}

describe('recognition pipeline (mock mode)', () => {
  it.each(MOCK_SCENARIO_IDS)('scenario "%s" produces a valid, simulated, persistable result', async (id) => {
    const result = await runMock(id);
    expect(result.isSimulated).toBe(true);
    expect(result.stages).toHaveLength(9);
    expect(result.stages.every((s) => s.status === 'completed')).toBe(true);
    const all = [result.bestMatch!, ...result.alternatives];
    expect(all).toHaveLength(toppsFlagshipFootball2026Variations.length);
    expect(all.reduce((sum, c) => sum + c.confidence, 0)).toBeCloseTo(1);

    const scan = resultToScan('scan-x', '2026-10-05T12:00:00.000Z', { front: 'doc:a', back: 'doc:b' }, result);
    expect(CardScanSchema.safeParse(scan).success).toBe(true);
  });

  it('resolves a clear foil match with high confidence and no capture request', async () => {
    const result = await runMock('leather-foil');
    expect(result.bestMatch?.name).toBe('Football Leather Foil');
    expect(result.bestMatch!.confidence).toBeGreaterThan(0.75);
    expect(result.needsAnotherScan).toBe(false);
    expect(result.evidence).toContain('No serial number detected');
  });

  it('requests a tilt scan when foil patterns cannot be separated', async () => {
    const result = await runMock('needs-tilt');
    expect(result.needsAnotherScan).toBe(true);
    expect(result.captureRequests.some((r) => r.side === 'tilt')).toBe(true);
    expect(result.captureRequests.map((r) => r.instruction)).toContain('Tilt the lower-right border under light.');
  });

  it('detects the serial number from OCR text with the real detector', async () => {
    const result = await runMock('serial-numbered');
    expect(result.serial).toMatchObject({ status: 'found', side: 'back', serial: { normalized: '23/50' } });
    expect(result.needsAnotherScan).toBe(true);
  });

  it('does not read a serial number from a side that was not captured', async () => {
    const result = await runMock('serial-numbered', { frontImageUri: 'file:///front.jpg', backImageUri: undefined });
    expect(result.serial.status).not.toBe('found');
  });

  it('picks Base for a plain card', async () => {
    expect((await runMock('base')).bestMatch?.name).toBe('Base');
  });

  it('requires at least one image', async () => {
    await expect(runMock('base', {})).rejects.toBeInstanceOf(RecognitionError);
  });
});

describe('recognition pipeline (offline mode)', () => {
  it('reports unimplemented stages honestly and returns an undetermined result', async () => {
    const pipeline = createRecognitionPipeline({ mode: 'offline', mockScenarioId: 'base', variationSource });
    const result = await pipeline.run({ captures: bothSides, productHintId: TOPPS_FLAGSHIP_FOOTBALL_2026_ID });

    expect(result.isSimulated).toBe(false);
    const statuses = Object.fromEntries(result.stages.map((s) => [s.stage, s.status]));
    expect(statuses).toMatchObject({
      OCRExtractor: 'not_implemented',
      VisualFeatureExtractor: 'not_implemented',
      VariationClassifier: 'completed',
    });
    expect(result.serial.status).toBe('not_analyzed');
    expect(result.overallConfidence).toBe(0);
    expect(result.needsAnotherScan).toBe(true);
    // Seeded variations have no verified rules, so every candidate is equally likely.
    const confidences = [result.bestMatch!, ...result.alternatives].map((c) => c.confidence);
    expect(new Set(confidences.map((c) => c.toFixed(6))).size).toBe(1);
  });

  it('fails clearly when the product has no variations', async () => {
    const pipeline = createRecognitionPipeline({ mode: 'offline', mockScenarioId: 'base', variationSource });
    await expect(pipeline.run({ captures: bothSides, productHintId: 'unknown' })).rejects.toThrow('No variations');
  });

  it('records a failing optional stage as a warning instead of crashing', async () => {
    const base = createRecognitionPipeline({ mode: 'mock', mockScenarioId: 'base', variationSource });
    // Swap in a broken OCR stage to check graceful degradation.
    const stages = (base as unknown as { stages: ConstructorParameters<typeof RecognitionPipeline>[0] }).stages;
    const pipeline = new RecognitionPipeline(
      { ...stages, ocr: { implementation: 'BrokenOCR', extract: async () => Promise.reject(new Error('boom')) } },
      { mode: 'mock' },
    );
    const result = await pipeline.run({ captures: bothSides, productHintId: TOPPS_FLAGSHIP_FOOTBALL_2026_ID });
    expect(result.stages.find((s) => s.stage === 'OCRExtractor')).toMatchObject({ status: 'failed', message: 'boom' });
    expect(result.warnings).toContain('OCRExtractor failed: boom');
    expect(result.serial.status).toBe('not_analyzed');
  });
});
