import {
  classifyVariations,
  deriveCaptureRequests,
  scoreVariation,
  softmax,
} from '@/features/variations/engine';

import { context, feature, serialFound, serialNotFound, signature, variation } from './helpers/fixtures';

const pebbled = variation(
  'pebbled-foil',
  [
    signature('surface.finish', ['reflective-foil'], { weight: 1.5 }),
    signature('border.texture', ['pebbled'], { weight: 3, requiresTilt: true, region: 'lower-right' }),
  ],
  [
    { kind: 'not_serial_numbered', weight: 1 },
    {
      kind: 'excludes_feature',
      predicate: { key: 'foil.pattern', anyOf: ['diamond-faceted'] },
      description: 'Diamond-faceted foil',
      weight: 1.5,
    },
  ],
);
const base = variation('base', [signature('surface.finish', ['matte', 'glossy'], { weight: 2 })], [
  { kind: 'not_serial_numbered', weight: 1 },
]);
const holo = variation(
  'holo',
  [
    signature('surface.finish', ['reflective-foil'], { weight: 1.5 }),
    signature('foil.pattern', ['holographic'], { weight: 2.5, requiresTilt: true }),
  ],
  [{ kind: 'not_serial_numbered', weight: 1 }],
);
const numbered50 = variation('numbered-50', [], [{ kind: 'serial_numbered', printRun: 50, weight: 3 }]);
const noRules = variation('no-rules');

const ALL = [pebbled, base, holo, numbered50, noRules];

describe('softmax', () => {
  it('produces a probability distribution', () => {
    const p = softmax([2, 1, 0], 1);
    expect(p.reduce((a, b) => a + b, 0)).toBeCloseTo(1);
    expect(p[0]).toBeGreaterThan(p[1]!);
  });

  it('is uniform for equal scores and stable for large values', () => {
    expect(softmax([1000, 1000], 1)).toEqual([0.5, 0.5]);
    expect(softmax([], 1)).toEqual([]);
  });

  it('flattens with higher temperature', () => {
    const sharp = softmax([2, 0], 0.5)[0]!;
    const flat = softmax([2, 0], 3)[0]!;
    expect(sharp).toBeGreaterThan(flat);
  });
});

describe('scoreVariation', () => {
  it('rewards matching signatures and records evidence', () => {
    const s = scoreVariation(
      pebbled,
      context({ features: [feature('surface.finish', 'reflective-foil'), feature('border.texture', 'pebbled')] }),
    );
    expect(s.score).toBeGreaterThan(0);
    expect(s.evidence).toEqual(
      expect.arrayContaining([expect.stringContaining('surface.finish'), expect.stringContaining('border.texture'), 'No serial number detected']),
    );
    expect(s.conflictingEvidence).toHaveLength(0);
  });

  it('penalizes a different observed value as conflicting evidence', () => {
    const s = scoreVariation(base, context({ features: [feature('surface.finish', 'reflective-foil')] }));
    expect(s.score).toBeLessThan(0);
    expect(s.conflictingEvidence[0]).toContain('observed surface.finish = reflective-foil');
  });

  it('lists unobserved signatures as missing, flagging those that need a tilt scan', () => {
    const s = scoreVariation(pebbled, context());
    expect(s.missingEvidence).toEqual(
      expect.arrayContaining([expect.stringContaining('needs a tilt scan')]),
    );
  });

  it('applies exclusions', () => {
    const s = scoreVariation(pebbled, context({ features: [feature('foil.pattern', 'diamond-faceted')] }));
    expect(s.conflictingEvidence).toContain('Diamond-faceted foil observed (90%)');
  });

  it('checks serial numbering and print runs', () => {
    expect(scoreVariation(numbered50, context({ serial: serialFound(23, 50) })).evidence[0]).toContain('23/50');
    const wrongRun = scoreVariation(numbered50, context({ serial: serialFound(23, 99) }));
    expect(wrongRun.score).toBeLessThan(0);
    expect(wrongRun.conflictingEvidence[0]).toContain('does not match expected /50');
    expect(scoreVariation(base, context({ serial: serialFound(1, 1) })).conflictingEvidence[0]).toContain('not numbered');
    expect(scoreVariation(base, context({ serial: { status: 'not_analyzed', reason: 'x' } })).missingEvidence).toContain(
      'Serial number not analyzed',
    );
  });

  it('matches required text patterns from OCR', () => {
    const v = variation('text', [], [
      { kind: 'requires_text', side: 'back', pattern: 'rookie\\s+card', description: 'Rookie Card text', weight: 1 },
    ]);
    expect(scoreVariation(v, context({ ocrText: { back: 'ROOKIE CARD' } })).score).toBe(1);
    expect(scoreVariation(v, context({ ocrText: { back: 'nothing' } })).score).toBeLessThan(0);
    expect(scoreVariation(v, context()).missingEvidence[0]).toContain('back text not available');
  });

  it('reports variations with no rules instead of inventing a score', () => {
    const s = scoreVariation(noRules, context({ features: [feature('surface.finish', 'glossy')] }));
    expect(s).toMatchObject({ score: 0, hasNoRules: true, evidence: [] });
    expect(s.missingEvidence[0]).toContain('No verified visual signatures');
  });
});

describe('classifyVariations', () => {
  it('compares against ALL variations and returns a sorted distribution summing to 1', () => {
    const { candidates } = classifyVariations(
      ALL,
      context({ features: [feature('surface.finish', 'reflective-foil'), feature('border.texture', 'pebbled')] }),
    );
    expect(candidates).toHaveLength(ALL.length);
    expect(candidates.reduce((sum, c) => sum + c.confidence, 0)).toBeCloseTo(1);
    expect(candidates.map((c) => c.confidence)).toEqual([...candidates.map((c) => c.confidence)].sort((a, b) => b - a));
    expect(candidates[0]?.variationId).toBe('pebbled-foil');
    expect(candidates[0]!.confidence).toBeGreaterThan(0.75);
  });

  it('prefers the base card when no foil is observed', () => {
    const { candidates } = classifyVariations(ALL, context({ features: [feature('surface.finish', 'glossy')] }));
    expect(candidates[0]?.variationId).toBe('base');
  });

  it('prefers the numbered parallel when a matching serial number is found', () => {
    const { candidates } = classifyVariations(ALL, context({ serial: serialFound(23, 50) }));
    expect(candidates[0]?.variationId).toBe('numbered-50');
  });

  it('stays uncertain when the evidence cannot separate candidates', () => {
    const { candidates } = classifyVariations(ALL, context({ features: [feature('surface.finish', 'reflective-foil')] }));
    const [first, second] = candidates;
    expect(first!.confidence - second!.confidence).toBeLessThan(0.05);
  });

  it('is uniform when no variation has rules (nothing hard-coded)', () => {
    const { candidates } = classifyVariations([noRules, variation('other')], context());
    expect(candidates.map((c) => c.confidence)).toEqual([0.5, 0.5]);
  });

  it('derives tilt requests from the data of the top candidates', () => {
    const ctx = context({ features: [feature('surface.finish', 'reflective-foil')] });
    const { candidates } = classifyVariations(ALL, ctx);
    const requests = deriveCaptureRequests(candidates.slice(0, 2), new Map(ALL.map((v) => [v.id, v])), ctx);
    expect(requests).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ side: 'tilt', region: 'lower-right', instruction: 'Tilt the lower-right border under light.' }),
      ]),
    );
  });

  it('requests the back when serial rules matter and the back was not captured', () => {
    const ctx = context({ captured: { front: true, back: false, tilt: false }, serial: serialNotFound });
    const requests = deriveCaptureRequests(
      [{ variationId: 'numbered-50', name: 'n', confidence: 1, evidence: [], missingEvidence: [], conflictingEvidence: [] }],
      new Map(ALL.map((v) => [v.id, v])),
      ctx,
    );
    expect(requests).toEqual([expect.objectContaining({ side: 'back', instruction: 'Capture the back of the card.' })]);
  });
});
