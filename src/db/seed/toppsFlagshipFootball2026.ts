import type { CardVariation, Product } from '@/models';

/*
 * DEVELOPMENT SEED — NOT A VERIFIED CHECKLIST.
 *
 * Only variation NAMES are seeded so the UI and architecture can be exercised. Print runs, pack
 * odds, exclusivity, colors, finishes and visual signatures are deliberately left null/empty and
 * every record is marked `unverified`. Populate them only from a reliable checklist (Phase 3),
 * recording the `source`, and only then flip `verificationStatus` to `verified`.
 */

export const TOPPS_FLAGSHIP_FOOTBALL_2026_ID = 'topps-flagship-football-2026';

export const toppsFlagshipFootball2026Product: Product = {
  id: TOPPS_FLAGSHIP_FOOTBALL_2026_ID,
  year: 2026,
  manufacturer: 'Topps',
  name: 'Topps Flagship Football',
  sport: 'football',
  verificationStatus: 'unverified',
  notes: 'Development placeholder. Checklist and parallels not yet verified.',
};

const PLACEHOLDER_VARIATION_NAMES = [
  'Base',
  'Holo Foil',
  'Diamante Foil',
  'Football Leather Foil',
  'Crackle Foil',
  'Pink',
  'Blue',
  'Green',
  'Gold',
  'Orange',
  'Black',
  'Red',
  'FoilFractor',
] as const;

export type PlaceholderVariationName = (typeof PLACEHOLDER_VARIATION_NAMES)[number];

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function seedVariationId(name: PlaceholderVariationName): string {
  return `${TOPPS_FLAGSHIP_FOOTBALL_2026_ID}:${slugify(name)}`;
}

export const toppsFlagshipFootball2026Variations: CardVariation[] = PLACEHOLDER_VARIATION_NAMES.map(
  (name, index) => ({
    id: seedVariationId(name),
    productId: TOPPS_FLAGSHIP_FOOTBALL_2026_ID,
    name,
    // "Base" is the only category we can state without a checklist; everything else is unknown.
    category: name === 'Base' ? 'base' : 'parallel',
    serialNumbered: null,
    printRun: null,
    color: null,
    foilType: null,
    textureType: null,
    exclusivity: null,
    visualSignatures: [],
    identificationRules: [],
    verificationStatus: 'unverified',
    source: null,
    notes: 'Development placeholder name only. Metadata unverified.',
    sortOrder: index,
  }),
);
