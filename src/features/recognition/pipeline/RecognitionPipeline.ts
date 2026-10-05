import type { RecognitionMode } from '@/models';
import type { EvidenceContext, SerialNumberDetection } from '@/features/variations/engine';

import {
  RecognitionError,
  StageNotImplementedError,
  type CardBoundary,
  type IdentityResolution,
  type ImageQualityReport,
  type OcrResult,
  type RecognitionInput,
  type RecognitionResult,
  type RecognitionStages,
  type StageName,
  type StageReport,
} from './types';

export type PipelineOptions = {
  mode: RecognitionMode;
  /** Implementation names that return fixture data; any of them running marks the result simulated. */
  simulatedImplementations?: ReadonlySet<string>;
  scenarioLabel?: string;
  now?: () => number;
};

/**
 * Orchestrates the recognition stages:
 *
 * ImageQualityAnalyzer → CardBoundaryDetector → OCRExtractor → CardIdentityResolver →
 * SerialNumberDetector → VisualFeatureExtractor → VariationCandidateResolver →
 * VariationClassifier → ConfidenceScorer → RecognitionResult
 *
 * Early stages degrade gracefully (a missing OCR result just means less evidence). Variation
 * resolution and classification are required; if they fail the whole recognition fails.
 */
export class RecognitionPipeline {
  constructor(
    private readonly stages: RecognitionStages,
    private readonly options: PipelineOptions,
  ) {}

  async run(input: RecognitionInput): Promise<RecognitionResult> {
    const { captures } = input;
    if (!captures.frontImageUri && !captures.backImageUri) {
      throw new RecognitionError('At least one image (front or back) is required', 'ImageQualityAnalyzer');
    }

    const reports: StageReport[] = [];
    const warnings: string[] = [];
    const now = this.options.now ?? Date.now;

    const optional = async <T>(stage: StageName, implementation: string, fn: () => Promise<T>, fallback: T) => {
      const started = now();
      try {
        const value = await fn();
        reports.push({ stage, implementation, status: 'completed', durationMs: now() - started });
        return value;
      } catch (error) {
        const notImplemented = error instanceof StageNotImplementedError;
        const message = error instanceof Error ? error.message : String(error);
        reports.push({
          stage,
          implementation,
          status: notImplemented ? 'not_implemented' : 'failed',
          durationMs: now() - started,
          message,
        });
        if (!notImplemented) warnings.push(`${stage} failed: ${message}`);
        return fallback;
      }
    };

    const required = async <T>(stage: StageName, implementation: string, fn: () => Promise<T>) => {
      const started = now();
      try {
        const value = await fn();
        reports.push({ stage, implementation, status: 'completed', durationMs: now() - started });
        return value;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        reports.push({ stage, implementation, status: 'failed', durationMs: now() - started, message });
        throw new RecognitionError(`${stage} failed: ${message}`, stage, error);
      }
    };

    const s = this.stages;

    const quality = await optional<ImageQualityReport[]>(
      'ImageQualityAnalyzer',
      s.imageQuality.implementation,
      () => s.imageQuality.analyze(captures),
      [],
    );
    for (const report of quality) {
      if (!report.acceptable) {
        warnings.push(`${report.side} image quality issues: ${report.issues.join(', ') || 'unknown'}`);
      }
    }

    const boundaries = await optional<CardBoundary[]>(
      'CardBoundaryDetector',
      s.boundary.implementation,
      () => s.boundary.detect(captures),
      [],
    );

    const ocr = await optional<OcrResult>('OCRExtractor', s.ocr.implementation, () => s.ocr.extract(captures, boundaries), {});

    const identity = await optional<IdentityResolution>(
      'CardIdentityResolver',
      s.identity.implementation,
      () => s.identity.resolve(ocr, input.productHintId),
      { identity: {}, confidence: 0, evidence: [] },
    );

    const serial = await optional<SerialNumberDetection>(
      'SerialNumberDetector',
      s.serial.implementation,
      () => s.serial.detect(ocr),
      { status: 'not_analyzed', reason: 'Serial number detector unavailable' },
    );

    const features = await optional(
      'VisualFeatureExtractor',
      s.visualFeatures.implementation,
      () => s.visualFeatures.extract(captures, boundaries),
      [],
    );

    const productId = identity.identity.productId ?? input.productHintId ?? null;
    if (!productId) {
      throw new RecognitionError('Could not determine which product this card belongs to', 'CardIdentityResolver');
    }
    if (!identity.identity.productId) {
      warnings.push('Product was not recognized from the card; using the selected product.');
    }

    const variations = await required('VariationCandidateResolver', s.candidates.implementation, () =>
      s.candidates.resolve(productId, identity.identity),
    );
    if (variations.length === 0) {
      throw new RecognitionError(`No variations are defined for product ${productId}`, 'VariationCandidateResolver');
    }
    if (variations.some((v) => v.verificationStatus !== 'verified')) {
      warnings.push('Some variation metadata for this product is unverified.');
    }

    const ctx: EvidenceContext = {
      features,
      serial,
      ocrText: { front: ocr.front?.fullText, back: ocr.back?.fullText },
      captured: {
        front: Boolean(captures.frontImageUri),
        back: Boolean(captures.backImageUri),
        tilt: Boolean(captures.tiltFrameUris?.length),
      },
    };

    const classification = await required('VariationClassifier', s.classifier.implementation, () =>
      s.classifier.classify(variations, ctx),
    );

    const assessment = await required('ConfidenceScorer', s.confidence.implementation, () =>
      s.confidence.assess({ identity, classification, variations, ctx }),
    );

    const [bestMatch = null, ...alternatives] = classification.candidates;
    const simulatedNames = this.options.simulatedImplementations ?? new Set<string>();
    const isSimulated = reports.some((r) => r.status === 'completed' && simulatedNames.has(r.implementation));

    const evidence = [...identity.evidence];
    if (serial.status === 'found') evidence.push(`Serial number ${serial.serial.normalized} detected on ${serial.side}`);
    if (serial.status === 'not_found') evidence.push('No serial number detected');
    if (bestMatch) evidence.push(...bestMatch.evidence);

    return {
      mode: this.options.mode,
      isSimulated,
      scenarioLabel: this.options.scenarioLabel,
      productId,
      identity: { ...identity.identity, productId },
      identityConfidence: identity.confidence,
      serial,
      bestMatch,
      alternatives,
      overallConfidence: assessment.overallConfidence,
      needsAnotherScan: assessment.needsAnotherScan,
      evidence: Array.from(new Set(evidence)),
      warnings: [...warnings, ...assessment.reasons],
      captureRequests: assessment.captureRequests,
      stages: reports,
    };
  }
}
