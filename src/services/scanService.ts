import { createRecognitionPipeline, resultToScan, type MockScenarioId, type RecognitionResult } from '@/features/recognition';
import type { CardScan, RecognitionMode } from '@/models';
import type { Repositories } from '@/repositories';
import { createId } from '@/utils/id';

import { deleteScanImages, persistScanImage } from './imageStorage';

export type AnalyzeScanInput = {
  frontUri: string | null;
  backUri: string | null;
  productId: string;
  mode: RecognitionMode;
  mockScenarioId: MockScenarioId;
};

/**
 * Persists the captured images, runs the recognition pipeline and stores the resulting scan.
 * Every attempt is saved (unconfirmed) so scan history doubles as a future evaluation dataset.
 */
export async function analyzeAndSaveScan(
  repos: Repositories,
  input: AnalyzeScanInput,
): Promise<{ scan: CardScan; result: RecognitionResult }> {
  if (!input.frontUri && !input.backUri) throw new Error('Capture the front or back of the card first.');

  const scanId = createId('scan');
  try {
    const images = {
      front: input.frontUri ? await persistScanImage(scanId, 'front', input.frontUri) : null,
      back: input.backUri ? await persistScanImage(scanId, 'back', input.backUri) : null,
    };

    const pipeline = createRecognitionPipeline({
      mode: input.mode,
      mockScenarioId: input.mockScenarioId,
      variationSource: repos.variations,
    });
    // Stages receive the original capture URIs (already-readable files); storage refs are for persistence.
    const result = await pipeline.run({
      captures: { frontImageUri: input.frontUri ?? undefined, backImageUri: input.backUri ?? undefined },
      productHintId: input.productId,
    });

    const scan = await repos.scans.create(resultToScan(scanId, new Date().toISOString(), images, result));
    return { scan, result };
  } catch (error) {
    try {
      deleteScanImages(scanId);
    } catch {
      // Best-effort cleanup; the original error is more useful to the user.
    }
    throw error;
  }
}

/** Deletes a scan, its collection entry (via FK cascade) and its stored images. */
export async function deleteScan(repos: Repositories, scanId: string): Promise<void> {
  await repos.scans.delete(scanId);
  deleteScanImages(scanId);
}
