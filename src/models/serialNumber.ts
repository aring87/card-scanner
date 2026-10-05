import { z } from 'zod';

import { ConfidenceSchema } from './common';

/** A normalized serial number such as 23/50, 004/199 or 1/1. */
export const SerialNumberSchema = z
  .object({
    /** Text exactly as it appeared in the OCR input. */
    raw: z.string().min(1),
    /** Canonical "number/printRun" form without leading zeros, e.g. "4/199". */
    normalized: z.string().regex(/^\d+\/\d+$/),
    number: z.number().int().positive(),
    printRun: z.number().int().positive(),
    /** Zero-padded width of the number as printed (e.g. 3 for "004/199"), useful as evidence. */
    printedDigits: z.number().int().positive(),
    isOneOfOne: z.boolean(),
    /** Parser confidence; reduced when OCR character substitutions (O→0, l→1…) were required. */
    confidence: ConfidenceSchema,
  })
  .refine((s) => s.number <= s.printRun, { message: 'Serial number cannot exceed its print run' });
export type SerialNumber = z.infer<typeof SerialNumberSchema>;
