import { seedVariationId, type PlaceholderVariationName } from '@/db/seed/toppsFlagshipFootball2026';
import type { CardVariation, IdentificationRule, VisualSignature } from '@/models';

/*
 * DEMO-ONLY RULES — INVENTED TO EXERCISE THE UI. NOT PRODUCT FACTS.
 *
 * These signatures exist only so mock mode can demonstrate how the data-driven engine produces
 * ranked candidates, evidence and capture requests. They are applied in memory by
 * DemoRuleOverlayResolver, are never written to the database, and every result they influence is
 * flagged `isSimulated`. Real signatures must come from the verified checklist (Phase 3).
 */

type DemoRules = { visualSignatures: VisualSignature[]; identificationRules: IdentificationRule[] };

const reflectiveFoil: VisualSignature = {
  id: 'demo-reflective-foil',
  description: 'Reflective foil surface',
  predicate: { key: 'surface.finish', anyOf: ['reflective-foil'] },
  region: 'full',
  weight: 2.5,
  requiresTilt: false,
};

const notNumbered: IdentificationRule = { kind: 'not_serial_numbered', weight: 1 };

const borderColor = (color: string): DemoRules => ({
  visualSignatures: [
    {
      id: `demo-border-${color}`,
      description: `${color[0]?.toUpperCase()}${color.slice(1)} border color`,
      predicate: { key: 'border.color', anyOf: [color] },
      region: 'border',
      weight: 2,
      requiresTilt: false,
    },
  ],
  identificationRules: [],
});

const DEMO_RULES: Partial<Record<PlaceholderVariationName, DemoRules>> = {
  Base: {
    visualSignatures: [
      {
        id: 'demo-non-foil',
        description: 'Non-foil (matte/glossy) surface',
        predicate: { key: 'surface.finish', anyOf: ['matte', 'glossy'] },
        region: 'full',
        weight: 2.5,
        requiresTilt: false,
      },
    ],
    identificationRules: [notNumbered],
  },
  'Holo Foil': {
    visualSignatures: [
      reflectiveFoil,
      {
        id: 'demo-holo-pattern',
        description: 'Holographic foil pattern',
        predicate: { key: 'foil.pattern', anyOf: ['holographic'] },
        region: 'full',
        weight: 2.5,
        requiresTilt: true,
      },
    ],
    identificationRules: [
      notNumbered,
      {
        kind: 'excludes_feature',
        predicate: { key: 'border.texture', anyOf: ['pebbled'] },
        description: 'Pebbled border texture',
        weight: 1.5,
      },
    ],
  },
  'Diamante Foil': {
    visualSignatures: [
      reflectiveFoil,
      {
        id: 'demo-diamond-pattern',
        description: 'Diamond-faceted foil pattern',
        predicate: { key: 'foil.pattern', anyOf: ['diamond-faceted'] },
        region: 'full',
        weight: 2.5,
        requiresTilt: true,
      },
    ],
    identificationRules: [notNumbered],
  },
  'Football Leather Foil': {
    visualSignatures: [
      reflectiveFoil,
      {
        id: 'demo-pebbled-border',
        description: 'Pebbled football-leather border texture',
        predicate: { key: 'border.texture', anyOf: ['pebbled'] },
        region: 'lower-right',
        weight: 3,
        requiresTilt: true,
      },
      {
        id: 'demo-brown-border',
        description: 'Brown leather-style border',
        predicate: { key: 'border.color', anyOf: ['brown'] },
        region: 'border',
        weight: 1.5,
        requiresTilt: false,
      },
    ],
    identificationRules: [
      notNumbered,
      {
        kind: 'excludes_feature',
        predicate: { key: 'foil.pattern', anyOf: ['diamond-faceted'] },
        description: 'Diamond-faceted foil',
        weight: 1.5,
      },
      {
        kind: 'excludes_feature',
        predicate: { key: 'border.finish', anyOf: ['smooth-silver'] },
        description: 'Smooth silver border',
        weight: 1.5,
      },
    ],
  },
  'Crackle Foil': {
    visualSignatures: [
      reflectiveFoil,
      {
        id: 'demo-crackle-pattern',
        description: 'Crackle foil pattern',
        predicate: { key: 'foil.pattern', anyOf: ['crackle'] },
        region: 'full',
        weight: 2.5,
        requiresTilt: true,
      },
    ],
    identificationRules: [notNumbered],
  },
  Pink: borderColor('pink'),
  Blue: borderColor('blue'),
  Green: borderColor('green'),
  Gold: borderColor('gold'),
  Orange: borderColor('orange'),
  Black: borderColor('black'),
  Red: borderColor('red'),
  // FoilFractor intentionally has no demo rules, to show how rule-less variations are reported.
};

const demoRulesById = new Map<string, DemoRules>(
  Object.entries(DEMO_RULES).map(([name, rules]) => [
    seedVariationId(name as PlaceholderVariationName),
    rules as DemoRules,
  ]),
);

/** Overlays demo rules onto variations that have none of their own. Pure; returns new objects. */
export function applyDemoRules(variations: CardVariation[]): CardVariation[] {
  return variations.map((variation) => {
    const demo = demoRulesById.get(variation.id);
    const hasOwnRules = variation.visualSignatures.length > 0 || variation.identificationRules.length > 0;
    if (!demo || hasOwnRules) return variation;
    return { ...variation, ...demo };
  });
}
