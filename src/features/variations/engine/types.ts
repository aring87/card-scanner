import type { CaptureSide, CardRegion, SerialNumber } from '@/models';

/**
 * One visual fact produced by a VisualFeatureExtractor, e.g.
 * `{ key: 'border.texture', value: 'pebbled', confidence: 0.82, side: 'front', region: 'lower-right' }`.
 * Keys/values form a shared vocabulary with VisualSignature predicates (see docs/VARIATION_ENGINE.md).
 */
export type FeatureObservation = {
  key: string;
  value: string;
  confidence: number;
  side: CaptureSide;
  region?: CardRegion;
};

export type SerialNumberDetection =
  | { status: 'found'; serial: SerialNumber; candidates: SerialNumber[]; side: 'front' | 'back' }
  | { status: 'not_found'; searchedSides: ('front' | 'back')[] }
  | { status: 'not_analyzed'; reason: string };

/** Everything the variation classifier is allowed to look at. */
export type EvidenceContext = {
  features: FeatureObservation[];
  serial: SerialNumberDetection;
  ocrText: { front?: string; back?: string };
  captured: { front: boolean; back: boolean; tilt: boolean };
};

export type VariationScore = {
  variationId: string;
  name: string;
  /** Unbounded log-odds style score; converted to a probability across all candidates. */
  score: number;
  evidence: string[];
  missingEvidence: string[];
  conflictingEvidence: string[];
  /** True when the variation defines no signatures or rules at all, so nothing could be compared. */
  hasNoRules: boolean;
};
