import type { SerialNumberDetection } from '@/features/variations/engine';

import { findSerialNumbers } from '../serial/parseSerialNumber';
import type { OcrResult, SerialNumberDetector } from '../pipeline/types';

/**
 * Finds serial numbering in OCR text. Real (non-mock) logic: it is only as good as the OCR text
 * it receives. The back is searched first because most serial stamps are printed there.
 */
export class TextSerialNumberDetector implements SerialNumberDetector {
  readonly implementation = 'TextSerialNumberDetector';

  async detect(ocr: OcrResult): Promise<SerialNumberDetection> {
    const sides = (['back', 'front'] as const).filter((side) => ocr[side] !== undefined);
    if (sides.length === 0) {
      return { status: 'not_analyzed', reason: 'No OCR text available' };
    }
    for (const side of sides) {
      const candidates = findSerialNumbers(ocr[side]?.fullText ?? '');
      const [best] = candidates;
      if (best) return { status: 'found', serial: best, candidates, side };
    }
    return { status: 'not_found', searchedSides: sides };
  }
}
