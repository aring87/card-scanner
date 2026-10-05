import type { CardVariation, RecognitionCandidate } from '@/models';

import { scoreVariation } from './scoreVariation';
import type { EvidenceContext, VariationScore } from './types';

export type ClassifierOptions = {
  /**
   * Softmax temperature. Higher = flatter distribution / less overconfident. 1.0 is the neutral
   * default; it must be calibrated against labelled scans (Phase 6) rather than tuned by hand.
   */
  temperature: number;
};

export const DEFAULT_CLASSIFIER_OPTIONS: ClassifierOptions = { temperature: 1 };

/** Numerically stable softmax. */
export function softmax(scores: number[], temperature: number): number[] {
  if (scores.length === 0) return [];
  const t = temperature > 0 ? temperature : 1;
  const max = Math.max(...scores);
  const exps = scores.map((s) => Math.exp((s - max) / t));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / sum);
}

/**
 * Scores EVERY known variation for the identified product and converts the scores into a
 * probability distribution. Returned candidates are sorted by confidence (highest first).
 */
export function classifyVariations(
  variations: CardVariation[],
  ctx: EvidenceContext,
  options: ClassifierOptions = DEFAULT_CLASSIFIER_OPTIONS,
): { candidates: RecognitionCandidate[]; scores: VariationScore[] } {
  const scores = variations.map((v) => scoreVariation(v, ctx));
  const probabilities = softmax(
    scores.map((s) => s.score),
    options.temperature,
  );

  const candidates = scores
    .map<RecognitionCandidate>((s, i) => ({
      variationId: s.variationId,
      name: s.name,
      confidence: probabilities[i] ?? 0,
      evidence: s.evidence,
      missingEvidence: s.missingEvidence,
      conflictingEvidence: s.conflictingEvidence,
    }))
    .sort((a, b) => b.confidence - a.confidence);

  return { candidates, scores };
}
