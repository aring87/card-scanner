import type { CardVariation, DetectedCardIdentity } from '@/models';

import type { VariationCandidateResolver } from '../pipeline/types';

export type VariationSource = {
  listByProduct(productId: string): Promise<CardVariation[]>;
};

/** Loads every variation known for the product from local storage (the seeded/verified checklist). */
export class RepositoryVariationCandidateResolver implements VariationCandidateResolver {
  readonly implementation = 'RepositoryVariationCandidateResolver';

  constructor(private readonly source: VariationSource) {}

  async resolve(productId: string, _identity: DetectedCardIdentity): Promise<CardVariation[]> {
    return this.source.listByProduct(productId);
  }
}
