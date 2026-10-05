import type { SqlDatabase } from '@/db/types';

import { CardRepository } from './CardRepository';
import { CollectionRepository } from './CollectionRepository';
import { ProductRepository } from './ProductRepository';
import { ScanRepository } from './ScanRepository';
import { VariationRepository } from './VariationRepository';

export type Repositories = {
  cards: CardRepository;
  collection: CollectionRepository;
  products: ProductRepository;
  scans: ScanRepository;
  variations: VariationRepository;
};

export function createRepositories(db: SqlDatabase): Repositories {
  return {
    cards: new CardRepository(db),
    collection: new CollectionRepository(db),
    products: new ProductRepository(db),
    scans: new ScanRepository(db),
    variations: new VariationRepository(db),
  };
}

export { CardRepository, CollectionRepository, ProductRepository, ScanRepository, VariationRepository };
