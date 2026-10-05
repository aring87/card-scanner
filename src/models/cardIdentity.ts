import { z } from 'zod';

import { IdSchema } from './common';

export const SportSchema = z.enum(['football', 'baseball', 'basketball', 'hockey', 'soccer', 'other']);
export type Sport = z.infer<typeof SportSchema>;

/** A checklist entry: one specific card (before any parallel/variation is applied). */
export const CardIdentitySchema = z.object({
  id: IdSchema,
  year: z.number().int().min(1860).max(2100),
  manufacturer: z.string().min(1),
  product: z.string().min(1),
  setName: z.string().min(1),
  subsetName: z.string().min(1).nullable(),
  playerName: z.string().min(1),
  team: z.string().min(1).nullable(),
  cardNumber: z.string().min(1),
  rookie: z.boolean(),
  sport: SportSchema,
});
export type CardIdentity = z.infer<typeof CardIdentitySchema>;

/**
 * What the recognition pipeline believes about a card's identity. Every field is optional because
 * any stage may fail to determine it; `id` is only present once matched to a checklist entry.
 */
export const DetectedCardIdentitySchema = CardIdentitySchema.partial().extend({
  productId: IdSchema.optional(),
});
export type DetectedCardIdentity = z.infer<typeof DetectedCardIdentitySchema>;
