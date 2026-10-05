import { z } from 'zod';

import { DetectedCardIdentitySchema } from './cardIdentity';
import { ConfidenceSchema, IdSchema, IsoDateTimeSchema } from './common';
import { CaptureRequestSchema, RecognitionCandidateSchema, RecognitionModeSchema } from './recognition';
import { SerialNumberSchema } from './serialNumber';

/**
 * A user's correction. Stored alongside (never over) the original prediction so that the pair can
 * later become a labelled training/evaluation example (Phase 6).
 */
export const ScanCorrectionSchema = z.object({
  correctedAt: IsoDateTimeSchema,
  identity: DetectedCardIdentitySchema,
  variationId: IdSchema.nullable(),
  variationName: z.string().min(1).nullable(),
  serialNumber: SerialNumberSchema.nullable(),
});
export type ScanCorrection = z.infer<typeof ScanCorrectionSchema>;

export const CardScanSchema = z.object({
  id: IdSchema,
  createdAt: IsoDateTimeSchema,
  frontImageUri: z.string().min(1).nullable(),
  backImageUri: z.string().min(1).nullable(),
  tiltCaptureUri: z.string().min(1).nullable().optional(),
  detectedIdentity: DetectedCardIdentitySchema,
  detectedVariation: RecognitionCandidateSchema.nullable(),
  serialNumber: SerialNumberSchema.nullable(),
  /** Overall confidence of the identification (identity + variation). */
  confidence: ConfidenceSchema,
  evidence: z.array(z.string()),
  alternatives: z.array(RecognitionCandidateSchema),
  captureRequests: z.array(CaptureRequestSchema),
  recognitionMode: RecognitionModeSchema,
  /** True when produced by mock stages. Simulated results must never be used as training labels. */
  isSimulated: z.boolean(),
  userConfirmed: z.boolean(),
  userCorrected: z.boolean(),
  correction: ScanCorrectionSchema.nullable(),
});
export type CardScan = z.infer<typeof CardScanSchema>;

export const CollectionItemSchema = z.object({
  id: IdSchema,
  scanId: IdSchema,
  addedAt: IsoDateTimeSchema,
  notes: z.string().nullable(),
});
export type CollectionItem = z.infer<typeof CollectionItemSchema>;

/** A collection item joined with the scan that produced it. */
export type CollectionEntry = CollectionItem & { scan: CardScan };
