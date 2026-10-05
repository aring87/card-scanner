import {
  StageNotImplementedError,
  type CardBoundaryDetector,
  type CardIdentityResolver,
  type ImageQualityAnalyzer,
  type OCRExtractor,
  type VisualFeatureExtractor,
} from '../pipeline/types';

/*
 * Placeholders for stages that will be backed by real implementations in later phases
 * (Phase 2: OCR/identity, Phase 4: visual features, Phase 5: tilt analysis). They fail loudly
 * instead of returning invented data, and the pipeline records them as `not_implemented`.
 */

export const notImplementedImageQuality: ImageQualityAnalyzer = {
  implementation: 'NotImplemented',
  analyze: async () => {
    throw new StageNotImplementedError('ImageQualityAnalyzer');
  },
};

export const notImplementedBoundary: CardBoundaryDetector = {
  implementation: 'NotImplemented',
  detect: async () => {
    throw new StageNotImplementedError('CardBoundaryDetector');
  },
};

export const notImplementedOcr: OCRExtractor = {
  implementation: 'NotImplemented',
  extract: async () => {
    throw new StageNotImplementedError('OCRExtractor');
  },
};

export const notImplementedIdentity: CardIdentityResolver = {
  implementation: 'NotImplemented',
  resolve: async () => {
    throw new StageNotImplementedError('CardIdentityResolver');
  },
};

export const notImplementedVisualFeatures: VisualFeatureExtractor = {
  implementation: 'NotImplemented',
  extract: async () => {
    throw new StageNotImplementedError('VisualFeatureExtractor');
  },
};
