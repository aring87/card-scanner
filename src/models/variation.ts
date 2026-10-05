import { z } from 'zod';

import { CardRegionSchema, IdSchema, VerificationStatusSchema } from './common';

export const VariationCategorySchema = z.enum([
  'base',
  'parallel',
  'insert',
  'insert_parallel',
  'short_print',
  'image_variation',
  'other',
]);
export type VariationCategory = z.infer<typeof VariationCategorySchema>;

/**
 * Matches an extracted visual feature, e.g. `{ key: 'border.texture', anyOf: ['pebbled'] }`.
 * Feature keys/values are a shared vocabulary between the VisualFeatureExtractor and variation data.
 */
export const FeaturePredicateSchema = z.object({
  key: z.string().min(1),
  anyOf: z.array(z.string().min(1)).min(1),
});
export type FeaturePredicate = z.infer<typeof FeaturePredicateSchema>;

/** Something a variation is expected to look like. Positive evidence when observed. */
export const VisualSignatureSchema = z.object({
  id: IdSchema,
  description: z.string().min(1),
  predicate: FeaturePredicateSchema,
  region: CardRegionSchema,
  /** Relative importance. 1 is a typical signature; larger values are more decisive. */
  weight: z.number().positive().max(10),
  /** True when the feature can only be reliably observed across multiple tilted frames. */
  requiresTilt: z.boolean(),
});
export type VisualSignature = z.infer<typeof VisualSignatureSchema>;

const RuleWeight = z.number().positive().max(10);

export const IdentificationRuleSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('serial_numbered'),
    /** null = numbered, but the print run is unknown or not constrained. */
    printRun: z.number().int().positive().nullable(),
    weight: RuleWeight,
  }),
  z.object({ kind: z.literal('not_serial_numbered'), weight: RuleWeight }),
  z.object({
    kind: z.literal('excludes_feature'),
    predicate: FeaturePredicateSchema,
    description: z.string().min(1),
    weight: RuleWeight,
  }),
  z.object({
    kind: z.literal('requires_text'),
    side: z.enum(['front', 'back']),
    /** Case-insensitive regular expression source applied to OCR text for that side. */
    pattern: z.string().min(1),
    description: z.string().min(1),
    weight: RuleWeight,
  }),
]);
export type IdentificationRule = z.infer<typeof IdentificationRuleSchema>;

export const CardVariationSchema = z.object({
  id: IdSchema,
  productId: IdSchema,
  name: z.string().min(1),
  category: VariationCategorySchema,
  /** null = not yet known/verified. */
  serialNumbered: z.boolean().nullable(),
  printRun: z.number().int().positive().nullable(),
  color: z.string().min(1).nullable(),
  foilType: z.string().min(1).nullable(),
  textureType: z.string().min(1).nullable(),
  exclusivity: z.string().min(1).nullable(),
  visualSignatures: z.array(VisualSignatureSchema),
  identificationRules: z.array(IdentificationRuleSchema),
  verificationStatus: VerificationStatusSchema,
  /** Where the metadata came from (checklist URL, sell sheet…). Required before marking verified. */
  source: z.string().min(1).nullable(),
  notes: z.string().nullable(),
  sortOrder: z.number().int(),
});
export type CardVariation = z.infer<typeof CardVariationSchema>;

export const ProductSchema = z.object({
  id: IdSchema,
  year: z.number().int().min(1860).max(2100),
  manufacturer: z.string().min(1),
  name: z.string().min(1),
  sport: z.string().min(1),
  verificationStatus: VerificationStatusSchema,
  notes: z.string().nullable(),
});
export type Product = z.infer<typeof ProductSchema>;
