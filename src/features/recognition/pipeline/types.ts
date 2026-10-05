import type {
  CaptureRequest,
  CardVariation,
  DetectedCardIdentity,
  RecognitionCandidate,
  RecognitionMode,
} from '@/models';
import type {
  EvidenceContext,
  FeatureObservation,
  SerialNumberDetection,
} from '@/features/variations/engine';

/** Images handed to the pipeline. URIs point at local files (file://…). */
export type CaptureSet = {
  frontImageUri?: string;
  backImageUri?: string;
  /** Future: ordered frames captured while the user tilts the card under light (Phase 5). */
  tiltFrameUris?: string[];
};

export type RecognitionInput = {
  captures: CaptureSet;
  /** Product to assume when identity resolution cannot determine one (e.g. user-selected product). */
  productHintId?: string;
};

// ---------------------------------------------------------------------------------------------
// Stage outputs
// ---------------------------------------------------------------------------------------------

export type ImageQualityIssue = 'blur' | 'glare' | 'too_dark' | 'too_bright' | 'card_not_found' | 'low_resolution';

export type ImageQualityReport = {
  side: 'front' | 'back';
  acceptable: boolean;
  /** 0..1 overall quality score; null when not analyzed. */
  score: number | null;
  issues: ImageQualityIssue[];
};

/** Normalized (0..1) quadrilateral corners of the card within the photo, clockwise from top-left. */
export type CardBoundary = {
  side: 'front' | 'back';
  corners: [Point, Point, Point, Point] | null;
  confidence: number;
};
export type Point = { x: number; y: number };

export type OcrTextBlock = { text: string; confidence: number; box?: [Point, Point, Point, Point] };
export type OcrSideResult = { side: 'front' | 'back'; fullText: string; blocks: OcrTextBlock[] };
export type OcrResult = { front?: OcrSideResult; back?: OcrSideResult };

export type IdentityResolution = {
  identity: DetectedCardIdentity;
  confidence: number;
  evidence: string[];
};

export type VariationClassification = {
  candidates: RecognitionCandidate[];
};

export type ConfidenceAssessment = {
  overallConfidence: number;
  needsAnotherScan: boolean;
  reasons: string[];
  captureRequests: CaptureRequest[];
};

export type StageName =
  | 'ImageQualityAnalyzer'
  | 'CardBoundaryDetector'
  | 'OCRExtractor'
  | 'CardIdentityResolver'
  | 'SerialNumberDetector'
  | 'VisualFeatureExtractor'
  | 'VariationCandidateResolver'
  | 'VariationClassifier'
  | 'ConfidenceScorer';

export type StageStatus = 'completed' | 'not_implemented' | 'skipped' | 'failed';

export type StageReport = {
  stage: StageName;
  implementation: string;
  status: StageStatus;
  durationMs: number;
  message?: string;
};

export type RecognitionResult = {
  mode: RecognitionMode;
  /** True when any stage returned fixture data. UI must label these results as simulated. */
  isSimulated: boolean;
  scenarioLabel?: string;
  productId: string | null;
  identity: DetectedCardIdentity;
  identityConfidence: number;
  serial: SerialNumberDetection;
  bestMatch: RecognitionCandidate | null;
  alternatives: RecognitionCandidate[];
  overallConfidence: number;
  needsAnotherScan: boolean;
  evidence: string[];
  warnings: string[];
  captureRequests: CaptureRequest[];
  stages: StageReport[];
};

// ---------------------------------------------------------------------------------------------
// Stage interfaces. Each has exactly one responsibility so implementations (on-device ML,
// cloud vision, heuristics) can be swapped independently.
// ---------------------------------------------------------------------------------------------

type Named = { readonly implementation: string };

export interface ImageQualityAnalyzer extends Named {
  analyze(captures: CaptureSet): Promise<ImageQualityReport[]>;
}

export interface CardBoundaryDetector extends Named {
  detect(captures: CaptureSet): Promise<CardBoundary[]>;
}

export interface OCRExtractor extends Named {
  extract(captures: CaptureSet, boundaries: CardBoundary[]): Promise<OcrResult>;
}

export interface CardIdentityResolver extends Named {
  resolve(ocr: OcrResult, productHintId?: string): Promise<IdentityResolution>;
}

export interface SerialNumberDetector extends Named {
  detect(ocr: OcrResult): Promise<SerialNumberDetection>;
}

export interface VisualFeatureExtractor extends Named {
  extract(captures: CaptureSet, boundaries: CardBoundary[]): Promise<FeatureObservation[]>;
}

export interface VariationCandidateResolver extends Named {
  /** Returns ALL variations known for the product so none can be silently excluded. */
  resolve(productId: string, identity: DetectedCardIdentity): Promise<CardVariation[]>;
}

export interface VariationClassifier extends Named {
  classify(variations: CardVariation[], ctx: EvidenceContext): Promise<VariationClassification>;
}

export interface ConfidenceScorer extends Named {
  assess(input: {
    identity: IdentityResolution;
    classification: VariationClassification;
    variations: CardVariation[];
    ctx: EvidenceContext;
  }): Promise<ConfidenceAssessment>;
}

export type RecognitionStages = {
  imageQuality: ImageQualityAnalyzer;
  boundary: CardBoundaryDetector;
  ocr: OCRExtractor;
  identity: CardIdentityResolver;
  serial: SerialNumberDetector;
  visualFeatures: VisualFeatureExtractor;
  candidates: VariationCandidateResolver;
  classifier: VariationClassifier;
  confidence: ConfidenceScorer;
};

/** Thrown by stages that exist as interfaces only. The pipeline records them as `not_implemented`. */
export class StageNotImplementedError extends Error {
  constructor(stage: StageName) {
    super(`${stage} is not implemented yet`);
    this.name = 'StageNotImplementedError';
  }
}

export class RecognitionError extends Error {
  constructor(
    message: string,
    readonly stage: StageName,
    readonly underlying?: unknown,
  ) {
    super(message);
    this.name = 'RecognitionError';
  }
}
