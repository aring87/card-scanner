import type { CardScan } from '@/models';

import type { RecognitionResult } from './pipeline/types';

/** Maps a pipeline result onto the persisted CardScan record (unconfirmed, uncorrected). */
export function resultToScan(
  id: string,
  createdAt: string,
  images: { front: string | null; back: string | null },
  result: RecognitionResult,
): CardScan {
  return {
    id,
    createdAt,
    frontImageUri: images.front,
    backImageUri: images.back,
    tiltCaptureUri: null,
    detectedIdentity: result.identity,
    detectedVariation: result.bestMatch,
    serialNumber: result.serial.status === 'found' ? result.serial.serial : null,
    confidence: result.overallConfidence,
    evidence: result.evidence,
    alternatives: result.alternatives,
    captureRequests: result.captureRequests,
    recognitionMode: result.mode,
    isSimulated: result.isSimulated,
    userConfirmed: false,
    userCorrected: false,
    correction: null,
  };
}
