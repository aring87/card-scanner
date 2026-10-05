import type {
  CardBoundaryDetector,
  CardIdentityResolver,
  ImageQualityAnalyzer,
  OCRExtractor,
  VariationCandidateResolver,
  VisualFeatureExtractor,
} from '../pipeline/types';
import type { VariationSource } from '../stages/RepositoryVariationCandidateResolver';
import { applyDemoRules } from './demoRules';
import type { MockScenario } from './scenarios';

export const MOCK_IMPLEMENTATION_NAMES = new Set([
  'MockImageQualityAnalyzer',
  'MockCardBoundaryDetector',
  'MockOCRExtractor',
  'MockCardIdentityResolver',
  'MockVisualFeatureExtractor',
  'DemoRuleOverlayResolver',
]);

export const mockImageQuality = (): ImageQualityAnalyzer => ({
  implementation: 'MockImageQualityAnalyzer',
  analyze: async (captures) => {
    const sides = (['front', 'back'] as const).filter((side) =>
      side === 'front' ? captures.frontImageUri : captures.backImageUri,
    );
    return sides.map((side) => ({ side, acceptable: true, score: null, issues: [] }));
  },
});

export const mockBoundary = (): CardBoundaryDetector => ({
  implementation: 'MockCardBoundaryDetector',
  // Assumes the user aligned the card with the on-screen guide.
  detect: async () => [],
});

/** Returns fixture text only for sides that were actually captured. */
export const mockOcr = (scenario: MockScenario): OCRExtractor => ({
  implementation: 'MockOCRExtractor',
  extract: async (captures) => ({
    front:
      captures.frontImageUri && scenario.ocr.front
        ? { side: 'front', fullText: scenario.ocr.front, blocks: [] }
        : undefined,
    back:
      captures.backImageUri && scenario.ocr.back
        ? { side: 'back', fullText: scenario.ocr.back, blocks: [] }
        : undefined,
  }),
});

export const mockIdentity = (scenario: MockScenario): CardIdentityResolver => ({
  implementation: 'MockCardIdentityResolver',
  resolve: async (_ocr, productHintId) => ({
    identity: { ...scenario.identity, productId: productHintId },
    confidence: scenario.identityConfidence,
    evidence: scenario.identityEvidence,
  }),
});

export const mockVisualFeatures = (scenario: MockScenario): VisualFeatureExtractor => ({
  implementation: 'MockVisualFeatureExtractor',
  extract: async (captures) =>
    scenario.features.filter((f) => (f.side === 'front' ? captures.frontImageUri : captures.backImageUri)),
});

export const demoRuleOverlayResolver = (source: VariationSource): VariationCandidateResolver => ({
  implementation: 'DemoRuleOverlayResolver',
  resolve: async (productId) => applyDemoRules(await source.listByProduct(productId)),
});
