import { toppsFlagshipFootball2026Variations } from '@/db/seed/toppsFlagshipFootball2026';
import {
  CardIdentitySchema,
  CardScanSchema,
  CardVariationSchema,
  DetectedCardIdentitySchema,
  IdentificationRuleSchema,
  RecognitionCandidateSchema,
  SerialNumberSchema,
  type CardScan,
} from '@/models';

const identity = {
  id: 'card-1',
  year: 2026,
  manufacturer: 'Topps',
  product: 'Topps Flagship Football',
  setName: 'Base Set',
  subsetName: null,
  playerName: 'Test Player',
  team: null,
  cardNumber: '101',
  rookie: true,
  sport: 'football',
};

const candidate = {
  variationId: 'v1',
  name: 'Test Variation',
  confidence: 0.9,
  evidence: ['a'],
  missingEvidence: [],
  conflictingEvidence: [],
};

export const validScan: CardScan = {
  id: 'scan-1',
  createdAt: '2026-10-05T12:00:00.000Z',
  frontImageUri: 'doc:scans/scan-1/front.jpg',
  backImageUri: null,
  tiltCaptureUri: null,
  detectedIdentity: { playerName: 'Test Player', productId: 'p1' },
  detectedVariation: candidate,
  serialNumber: null,
  confidence: 0.8,
  evidence: ['card number matched'],
  alternatives: [{ ...candidate, variationId: 'v2', confidence: 0.1 }],
  captureRequests: [],
  recognitionMode: 'mock',
  isSimulated: true,
  userConfirmed: false,
  userCorrected: false,
  correction: null,
};

describe('CardIdentitySchema', () => {
  it('accepts a complete identity', () => {
    expect(CardIdentitySchema.parse(identity)).toEqual(identity);
  });

  it('rejects missing or invalid fields', () => {
    expect(CardIdentitySchema.safeParse({ ...identity, playerName: '' }).success).toBe(false);
    expect(CardIdentitySchema.safeParse({ ...identity, year: 1500 }).success).toBe(false);
    expect(CardIdentitySchema.safeParse({ ...identity, sport: 'cricket' }).success).toBe(false);
  });

  it('allows partial detected identities', () => {
    expect(DetectedCardIdentitySchema.safeParse({}).success).toBe(true);
    expect(DetectedCardIdentitySchema.safeParse({ cardNumber: '12', productId: 'p' }).success).toBe(true);
  });
});

describe('SerialNumberSchema', () => {
  const serial = { raw: '23/50', normalized: '23/50', number: 23, printRun: 50, printedDigits: 2, isOneOfOne: false, confidence: 0.95 };

  it('accepts a valid serial', () => {
    expect(SerialNumberSchema.safeParse(serial).success).toBe(true);
  });

  it('rejects a serial above its print run', () => {
    expect(SerialNumberSchema.safeParse({ ...serial, number: 51 }).success).toBe(false);
  });
});

describe('RecognitionCandidateSchema', () => {
  it('requires confidence in 0..1', () => {
    expect(RecognitionCandidateSchema.safeParse(candidate).success).toBe(true);
    expect(RecognitionCandidateSchema.safeParse({ ...candidate, confidence: 96 }).success).toBe(false);
  });
});

describe('IdentificationRuleSchema', () => {
  it('validates each rule kind', () => {
    expect(IdentificationRuleSchema.safeParse({ kind: 'serial_numbered', printRun: 50, weight: 2 }).success).toBe(true);
    expect(IdentificationRuleSchema.safeParse({ kind: 'serial_numbered', printRun: null, weight: 2 }).success).toBe(true);
    expect(IdentificationRuleSchema.safeParse({ kind: 'not_serial_numbered', weight: 1 }).success).toBe(true);
    expect(
      IdentificationRuleSchema.safeParse({
        kind: 'excludes_feature',
        predicate: { key: 'foil.pattern', anyOf: ['crackle'] },
        description: 'Crackle foil',
        weight: 1,
      }).success,
    ).toBe(true);
  });

  it('rejects unknown kinds and empty predicates', () => {
    expect(IdentificationRuleSchema.safeParse({ kind: 'if_shiny_then_holo', weight: 1 }).success).toBe(false);
    expect(
      IdentificationRuleSchema.safeParse({
        kind: 'excludes_feature',
        predicate: { key: 'x', anyOf: [] },
        description: 'x',
        weight: 1,
      }).success,
    ).toBe(false);
  });
});

describe('CardScanSchema', () => {
  it('accepts a valid scan', () => {
    expect(CardScanSchema.parse(validScan)).toEqual(validScan);
  });

  it('rejects invalid timestamps and confidences', () => {
    expect(CardScanSchema.safeParse({ ...validScan, createdAt: 'yesterday' }).success).toBe(false);
    expect(CardScanSchema.safeParse({ ...validScan, confidence: 1.2 }).success).toBe(false);
  });
});

describe('development seed', () => {
  it('contains only valid, unverified placeholder variations with no invented metadata', () => {
    expect(toppsFlagshipFootball2026Variations).toHaveLength(13);
    for (const v of toppsFlagshipFootball2026Variations) {
      expect(CardVariationSchema.safeParse(v).success).toBe(true);
      expect(v).toMatchObject({
        verificationStatus: 'unverified',
        printRun: null,
        serialNumbered: null,
        exclusivity: null,
        visualSignatures: [],
        identificationRules: [],
        source: null,
      });
    }
  });
});
