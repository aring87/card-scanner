import { deriveCaptureRequests } from '@/features/variations/engine';

import type { ConfidenceAssessment, ConfidenceScorer } from '../pipeline/types';

export type ConfidenceThresholds = {
  /** Minimum best-match probability to accept without asking for another scan. */
  minBestConfidence: number;
  /** Minimum gap between the best and second-best candidates. */
  minMargin: number;
  /** How many top candidates to consider when deciding what extra capture to request. */
  candidatesForCaptureRequests: number;
};

export const DEFAULT_THRESHOLDS: ConfidenceThresholds = {
  minBestConfidence: 0.75,
  minMargin: 0.2,
  candidatesForCaptureRequests: 3,
};

export class DefaultConfidenceScorer implements ConfidenceScorer {
  readonly implementation = 'DefaultConfidenceScorer';

  constructor(private readonly thresholds: ConfidenceThresholds = DEFAULT_THRESHOLDS) {}

  async assess({
    identity,
    classification,
    variations,
    ctx,
  }: Parameters<ConfidenceScorer['assess']>[0]): Promise<ConfidenceAssessment> {
    const [best, second] = classification.candidates;
    const reasons: string[] = [];

    if (!best) {
      return { overallConfidence: 0, needsAnotherScan: true, reasons: ['No variation candidates'], captureRequests: [] };
    }
    if (identity.confidence === 0) reasons.push('Card identity could not be determined');
    if (best.evidence.length === 0) reasons.push('The best match has no supporting evidence yet');
    if (best.confidence < this.thresholds.minBestConfidence) {
      reasons.push(`Best match confidence is below ${Math.round(this.thresholds.minBestConfidence * 100)}%`);
    }
    if (second && best.confidence - second.confidence < this.thresholds.minMargin) {
      reasons.push(`${best.name} and ${second.name} are too close to call`);
    }

    const needsAnotherScan = reasons.length > 0;
    const captureRequests = needsAnotherScan
      ? deriveCaptureRequests(
          classification.candidates.slice(0, this.thresholds.candidatesForCaptureRequests),
          new Map(variations.map((v) => [v.id, v])),
          ctx,
        )
      : [];

    return {
      overallConfidence: Number((best.confidence * identity.confidence).toFixed(4)),
      needsAnotherScan,
      reasons,
      captureRequests,
    };
  }
}
