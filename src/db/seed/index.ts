import { ProductRepository } from '@/repositories/ProductRepository';
import { VariationRepository } from '@/repositories/VariationRepository';

import type { SqlDatabase } from '../types';
import { toppsFlagshipFootball2026Product, toppsFlagshipFootball2026Variations } from './toppsFlagshipFootball2026';

/**
 * Idempotently inserts the development product + placeholder variation names. Existing rows are
 * left untouched so locally verified/edited metadata is never overwritten by the seed.
 */
export async function seedDevelopmentData(db: SqlDatabase): Promise<void> {
  const products = new ProductRepository(db);
  const variations = new VariationRepository(db);
  await db.withTransactionAsync(async () => {
    await products.insertIfMissing(toppsFlagshipFootball2026Product);
    for (const variation of toppsFlagshipFootball2026Variations) {
      await variations.insertIfMissing(variation);
    }
  });
}

export { TOPPS_FLAGSHIP_FOOTBALL_2026_ID } from './toppsFlagshipFootball2026';
