import type { EvidenceContext, FeatureObservation, SerialNumberDetection } from '@/features/variations/engine';
import type { CardVariation, IdentificationRule, VisualSignature } from '@/models';

/** TEST FIXTURES ONLY — invented variations used to exercise the generic scoring engine. */

export function variation(
  id: string,
  visualSignatures: VisualSignature[] = [],
  identificationRules: IdentificationRule[] = [],
): CardVariation {
  return {
    id,
    productId: 'test-product',
    name: id,
    category: 'parallel',
    serialNumbered: null,
    printRun: null,
    color: null,
    foilType: null,
    textureType: null,
    exclusivity: null,
    visualSignatures,
    identificationRules,
    verificationStatus: 'unverified',
    source: null,
    notes: null,
    sortOrder: 0,
  };
}

export function signature(
  key: string,
  anyOf: string[],
  opts: Partial<Pick<VisualSignature, 'weight' | 'requiresTilt' | 'region' | 'description'>> = {},
): VisualSignature {
  return {
    id: `${key}=${anyOf.join('|')}`,
    description: opts.description ?? `${key} ${anyOf.join('/')}`,
    predicate: { key, anyOf },
    region: opts.region ?? 'full',
    weight: opts.weight ?? 1,
    requiresTilt: opts.requiresTilt ?? false,
  };
}

export function feature(key: string, value: string, confidence = 0.9): FeatureObservation {
  return { key, value, confidence, side: 'front' };
}

export const serialFound = (number: number, printRun: number): SerialNumberDetection => ({
  status: 'found',
  side: 'back',
  serial: {
    raw: `${number}/${printRun}`,
    normalized: `${number}/${printRun}`,
    number,
    printRun,
    printedDigits: String(number).length,
    isOneOfOne: printRun === 1,
    confidence: 0.95,
  },
  candidates: [],
});

export const serialNotFound: SerialNumberDetection = { status: 'not_found', searchedSides: ['back', 'front'] };

export function context(overrides: Partial<EvidenceContext> = {}): EvidenceContext {
  return {
    features: [],
    serial: serialNotFound,
    ocrText: {},
    captured: { front: true, back: true, tilt: false },
    ...overrides,
  };
}
