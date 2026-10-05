import {
  classifyVariations,
  DEFAULT_CLASSIFIER_OPTIONS,
  type ClassifierOptions,
  type EvidenceContext,
} from '@/features/variations/engine';
import type { CardVariation } from '@/models';

import type { VariationClassification, VariationClassifier } from '../pipeline/types';

/** Compares extracted evidence against every variation's data-driven signatures and rules. */
export class RuleBasedVariationClassifier implements VariationClassifier {
  readonly implementation = 'RuleBasedVariationClassifier';

  constructor(private readonly options: ClassifierOptions = DEFAULT_CLASSIFIER_OPTIONS) {}

  async classify(variations: CardVariation[], ctx: EvidenceContext): Promise<VariationClassification> {
    return { candidates: classifyVariations(variations, ctx, this.options).candidates };
  }
}
