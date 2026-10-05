import type { RecognitionMode } from '@/models';

import {
  demoRuleOverlayResolver,
  MOCK_IMPLEMENTATION_NAMES,
  mockBoundary,
  mockIdentity,
  mockImageQuality,
  mockOcr,
  mockVisualFeatures,
} from './mock/mockStages';
import { MOCK_SCENARIOS, type MockScenarioId } from './mock/scenarios';
import { RecognitionPipeline } from './pipeline/RecognitionPipeline';
import { DefaultConfidenceScorer } from './stages/DefaultConfidenceScorer';
import {
  notImplementedBoundary,
  notImplementedIdentity,
  notImplementedImageQuality,
  notImplementedOcr,
  notImplementedVisualFeatures,
} from './stages/notImplemented';
import {
  RepositoryVariationCandidateResolver,
  type VariationSource,
} from './stages/RepositoryVariationCandidateResolver';
import { RuleBasedVariationClassifier } from './stages/RuleBasedVariationClassifier';
import { TextSerialNumberDetector } from './stages/TextSerialNumberDetector';

export type PipelineConfig = {
  mode: RecognitionMode;
  mockScenarioId: MockScenarioId;
  variationSource: VariationSource;
};

/**
 * Builds the pipeline for the selected mode. Swapping a stage for a real implementation later
 * (on-device OCR, cloud vision, tilt analysis) only touches this factory.
 */
export function createRecognitionPipeline({ mode, mockScenarioId, variationSource }: PipelineConfig) {
  const shared = {
    serial: new TextSerialNumberDetector(),
    classifier: new RuleBasedVariationClassifier(),
    confidence: new DefaultConfidenceScorer(),
  };

  if (mode === 'mock') {
    const scenario = MOCK_SCENARIOS[mockScenarioId];
    return new RecognitionPipeline(
      {
        ...shared,
        imageQuality: mockImageQuality(),
        boundary: mockBoundary(),
        ocr: mockOcr(scenario),
        identity: mockIdentity(scenario),
        visualFeatures: mockVisualFeatures(scenario),
        candidates: demoRuleOverlayResolver(variationSource),
      },
      { mode, simulatedImplementations: MOCK_IMPLEMENTATION_NAMES, scenarioLabel: scenario.label },
    );
  }

  return new RecognitionPipeline(
    {
      ...shared,
      imageQuality: notImplementedImageQuality,
      boundary: notImplementedBoundary,
      ocr: notImplementedOcr,
      identity: notImplementedIdentity,
      visualFeatures: notImplementedVisualFeatures,
      candidates: new RepositoryVariationCandidateResolver(variationSource),
    },
    { mode },
  );
}
