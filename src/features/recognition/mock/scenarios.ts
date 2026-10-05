import type { FeatureObservation } from '@/features/variations/engine';
import type { DetectedCardIdentity } from '@/models';

/*
 * Fixture scenarios for mock recognition mode. Each one feeds canned stage outputs (OCR text,
 * identity, visual features) into the REAL serial detector, variation classifier and confidence
 * scorer, so the UI can be exercised end-to-end before any vision model exists.
 * Player names and card numbers are placeholders, not real checklist data.
 */

export type MockScenario = {
  id: MockScenarioId;
  label: string;
  description: string;
  ocr: { front?: string; back?: string };
  identity: Omit<DetectedCardIdentity, 'productId' | 'id'>;
  identityConfidence: number;
  identityEvidence: string[];
  features: FeatureObservation[];
};

export const MOCK_SCENARIO_IDS = ['leather-foil', 'needs-tilt', 'serial-numbered', 'base'] as const;
export type MockScenarioId = (typeof MOCK_SCENARIO_IDS)[number];

const sampleIdentity: MockScenario['identity'] = {
  year: 2026,
  manufacturer: 'Topps',
  product: 'Topps Flagship Football',
  setName: 'Base Set',
  subsetName: null,
  playerName: 'Sample Player (mock)',
  team: 'Sample Team (mock)',
  cardNumber: '101',
  rookie: false,
  sport: 'football',
};

const sampleBack = '© 2026 THE TOPPS COMPANY, INC. CARD 101 SAMPLE PLAYER (MOCK) QB SAMPLE TEAM';

const identityEvidence = ['Card number 101 matched (mock)', 'Copyright year 2026 read from back (mock)'];

export const MOCK_SCENARIOS: Record<MockScenarioId, MockScenario> = {
  'leather-foil': {
    id: 'leather-foil',
    label: 'Clear foil match',
    description: 'Front shows a pebbled, brown, reflective border. Should resolve to one foil with high confidence.',
    ocr: { front: 'SAMPLE PLAYER', back: sampleBack },
    identity: sampleIdentity,
    identityConfidence: 0.97,
    identityEvidence,
    features: [
      { key: 'surface.finish', value: 'reflective-foil', confidence: 0.92, side: 'front', region: 'full' },
      { key: 'border.texture', value: 'pebbled', confidence: 0.9, side: 'front', region: 'lower-right' },
      { key: 'border.color', value: 'brown', confidence: 0.85, side: 'front', region: 'border' },
    ],
  },
  'needs-tilt': {
    id: 'needs-tilt',
    label: 'Foil type unclear',
    description: 'Foil detected but its pattern is not visible in a still photo. Should request a tilt scan.',
    ocr: { front: 'SAMPLE PLAYER', back: sampleBack },
    identity: sampleIdentity,
    identityConfidence: 0.95,
    identityEvidence,
    features: [{ key: 'surface.finish', value: 'reflective-foil', confidence: 0.85, side: 'front', region: 'full' }],
  },
  'serial-numbered': {
    id: 'serial-numbered',
    label: 'Serial-numbered parallel',
    description: 'Back carries a 23/50 stamp. Print runs are unverified, so the parallel stays uncertain.',
    ocr: { front: 'SAMPLE PLAYER', back: `${sampleBack} 23/50` },
    identity: sampleIdentity,
    identityConfidence: 0.95,
    identityEvidence,
    features: [
      { key: 'surface.finish', value: 'glossy', confidence: 0.7, side: 'front', region: 'full' },
      { key: 'border.color', value: 'gold', confidence: 0.55, side: 'front', region: 'border' },
    ],
  },
  base: {
    id: 'base',
    label: 'Base card',
    description: 'Plain glossy card with no foil or serial number.',
    ocr: { front: 'SAMPLE PLAYER', back: sampleBack },
    identity: sampleIdentity,
    identityConfidence: 0.96,
    identityEvidence,
    features: [
      { key: 'surface.finish', value: 'glossy', confidence: 0.9, side: 'front', region: 'full' },
      { key: 'border.texture', value: 'smooth', confidence: 0.8, side: 'front', region: 'border' },
      { key: 'border.color', value: 'white', confidence: 0.85, side: 'front', region: 'border' },
    ],
  },
};
