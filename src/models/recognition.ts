import { z } from 'zod';

import { CaptureSideSchema, CardRegionSchema, ConfidenceSchema, IdSchema } from './common';

export const RecognitionCandidateSchema = z.object({
  variationId: IdSchema,
  name: z.string().min(1),
  confidence: ConfidenceSchema,
  evidence: z.array(z.string()),
  missingEvidence: z.array(z.string()),
  conflictingEvidence: z.array(z.string()),
});
export type RecognitionCandidate = z.infer<typeof RecognitionCandidateSchema>;

/** A request for the user to capture more information, e.g. "Tilt the lower-right border under light." */
export const CaptureRequestSchema = z.object({
  side: CaptureSideSchema,
  region: CardRegionSchema,
  instruction: z.string().min(1),
  reason: z.string().min(1),
});
export type CaptureRequest = z.infer<typeof CaptureRequestSchema>;

export const RecognitionModeSchema = z.enum(['mock', 'offline']);
export type RecognitionMode = z.infer<typeof RecognitionModeSchema>;
