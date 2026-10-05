# Variation engine

Code: `src/features/variations/engine/`. Models: `src/models/variation.ts`.

## Principle

There is no code of the form:

```ts
if (shiny) variation = 'Holo Foil';
```

Everything the engine knows about a variation comes from **data** stored with that variation. The classifier compares extracted evidence against **all** variations known for the identified product and returns a probability for each one, together with its reasons.

## Data model

```ts
CardVariation {
  id, productId, name, category,
  serialNumbered: boolean | null,   // null = not yet known
  printRun: number | null,
  color, foilType, textureType, exclusivity,   // all nullable until verified
  visualSignatures: VisualSignature[],
  identificationRules: IdentificationRule[],
  verificationStatus: 'unverified' | 'verified',
  source: string | null,            // required before marking verified
  notes, sortOrder,
}

VisualSignature {                   // positive evidence: what it looks like
  id, description,
  predicate: { key: 'border.texture', anyOf: ['pebbled'] },
  region: 'lower-right',            // where to look / where to ask the user to tilt
  weight: 3,                        // relative importance
  requiresTilt: true,               // only reliably observable across tilted frames
}

IdentificationRule =                // constraints
  | { kind: 'serial_numbered', printRun: 50 | null, weight }
  | { kind: 'not_serial_numbered', weight }
  | { kind: 'excludes_feature', predicate, description, weight }   // e.g. smooth silver border
  | { kind: 'requires_text', side: 'front' | 'back', pattern, description, weight }
```

Example (the shape only; the actual content must come from a verified checklist):

```yaml
variation: Football Leather Foil
visualSignatures:
  - border.texture ∈ {pebbled}        region lower-right, requiresTilt, weight 3
  - border.color   ∈ {brown}          region border, weight 1.5
  - surface.finish ∈ {reflective-foil} weight 2.5
identificationRules:
  - not_serial_numbered
  - excludes_feature border.finish ∈ {smooth-silver}
  - excludes_feature foil.pattern  ∈ {diamond-faceted}
```

### Feature vocabulary

`VisualFeatureExtractor` emits `FeatureObservation { key, value, confidence, side, region? }`. Signatures match on `key` and `value`, so keys and values form a **shared vocabulary**. The keys used so far (by fixtures and demo rules only):

| Key | Example values |
| --- | --- |
| `surface.finish` | `matte`, `glossy`, `reflective-foil` |
| `foil.pattern` | `none`, `holographic`, `diamond-faceted`, `crackle` |
| `border.texture` | `smooth`, `pebbled` |
| `border.color` | `white`, `brown`, `gold`, `blue`, … |
| `border.finish` | `smooth-silver`, … |

Before Phase 4, freeze this vocabulary as a Zod enum, so that extractor output and checklist data cannot drift apart.

## Scoring (`scoreVariation.ts`)

For each variation, the score starts at 0 and then:

| Situation | Effect | Recorded as |
| --- | --- | --- |
| Signature's feature observed with a matching value | `+ weight × confidence` | evidence |
| Feature observed with a **different** value | `− weight × confidence` | conflicting evidence |
| Feature not observed | 0 | missing evidence (with "needs a tilt scan" if `requiresTilt`) |
| `serial_numbered` and a serial matches (or print run unconstrained) | `+ weight × serialConfidence` | evidence |
| `serial_numbered` and a serial with a different print run | `− weight × serialConfidence` | conflict |
| `serial_numbered` and no serial found | `− weight × 0.5` (absence is weaker evidence) | conflict |
| `not_serial_numbered` and a serial found / not found | `− w × conf` / `+ w × 0.5` | conflict / evidence |
| `excludes_feature` observed / different value observed | `− w × conf` / `+ w × conf × 0.25` | conflict / evidence |
| `requires_text` matched / text present but no match | `+ w` / `− w × 0.5` | evidence / conflict |
| Serial or text not analyzed | 0 | missing |
| Variation has **no** signatures or rules | score 0 | missing: *"No verified visual signatures or identification rules defined yet"* |

## Classification (`classifyVariations.ts`)

Scores are turned into probabilities with a numerically stable **softmax** (temperature 1 by default), so the candidates always sum to 100%. This is how a result like *Football Leather Foil 96% · Diamante 2% · Holo 1%* comes about: the percentages are a consequence of the data and the observations, not constants.

The temperature (and eventually per-feature weights) must be **calibrated on labelled scans** (Phase 6). Hand-tuning them to make demos look good isn't allowed.

## Confidence and "need another scan?" (`DefaultConfidenceScorer`, `captureRequests.ts`)

Another scan is needed if any of these hold:

- the best match is below 75%, or
- it is within 20 points of the runner-up, or
- it has no supporting evidence, or
- the identity is unknown.

In that case, capture requests are derived from the **top 3 candidates' data**:

- an unobserved signature with `requiresTilt` and no tilt capture → *"Tilt {region} under light."*;
- an unobserved non-tilt signature and no front photo → *"Capture the front of the card."*;
- a serial rule on a top candidate, with no back photo and no serial found → *"Capture the back of the card."*

## Verification policy

- The seed (`src/db/seed/toppsFlagshipFootball2026.ts`) contains **variation names only**. Every other field is `null` or empty, and every record is `unverified`.
- `VariationRepository.upsert` refuses to save a `verified` variation without a `source`.
- The seed is insert-if-missing, so it never overwrites curated data.
- Demo rules used by mock mode (`src/features/recognition/mock/demoRules.ts`) are invented. They are applied **in memory only**, and every result they affect is marked `isSimulated` and labelled in the UI.

## Adding verified data (Phase 3)

1. Collect the checklist and parallel information from a reliable source (official checklist / sell sheet), and record its URL or reference.
2. For each variation, set `serialNumbered`/`printRun`, `category`, and so on, and author its signatures and rules using the feature vocabulary.
3. Import it via `VariationRepository.upsert` (or a migration/seed for bundled data) with `verificationStatus: 'verified'` and `source` set.
4. Add regression tests: labelled feature sets → expected top candidate.
