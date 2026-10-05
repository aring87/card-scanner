import { z } from 'zod';

/** A probability/confidence in the closed range 0..1. Format as a percentage only at the UI edge. */
export const ConfidenceSchema = z.number().min(0).max(1);
export type Confidence = z.infer<typeof ConfidenceSchema>;

export const IdSchema = z.string().min(1);

export const IsoDateTimeSchema = z.iso.datetime();

/**
 * Every piece of product/variation metadata carries a verification status. Nothing should be
 * treated as fact by the recognition engine unless it is `verified` against a reliable checklist.
 */
export const VerificationStatusSchema = z.enum(['unverified', 'verified']);
export type VerificationStatus = z.infer<typeof VerificationStatusSchema>;

export const CaptureSideSchema = z.enum(['front', 'back', 'tilt']);
export type CaptureSide = z.infer<typeof CaptureSideSchema>;

/** Coarse card regions used by visual signatures and "please re-scan this area" requests. */
export const CardRegionSchema = z.enum([
  'full',
  'center',
  'border',
  'top-border',
  'bottom-border',
  'left-border',
  'right-border',
  'upper-left',
  'upper-right',
  'lower-left',
  'lower-right',
  'nameplate',
  'logo',
]);
export type CardRegion = z.infer<typeof CardRegionSchema>;
