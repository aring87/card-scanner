# Recognition pipeline

Code: `src/features/recognition/`

```
CaptureSet (front, back, tilt frames*)
      │
      ▼
ImageQualityAnalyzer        blur / glare / exposure per side                 [optional]
      ▼
CardBoundaryDetector        card quadrilateral within each photo             [optional]
      ▼
OCRExtractor                text blocks for front and back                   [optional]
      ▼
CardIdentityResolver        player, year, product, set, card # → productId   [optional]
      ▼
SerialNumberDetector        23/50, 004/199, 1/1 … from OCR text              [optional]
      ▼
VisualFeatureExtractor      FeatureObservation[] (finish, pattern, border…)  [optional]
      ▼
VariationCandidateResolver  ALL variations known for the product             [required]
      ▼
VariationClassifier         probability for every variation + evidence       [required]
      ▼
ConfidenceScorer            overall confidence, "need another scan?", requests [required]
      ▼
RecognitionResult
```

\* Tilt frames are part of `CaptureSet` already, but no stage consumes them yet (Phase 5).

## Contracts

All interfaces are in `pipeline/types.ts`. Each stage:

- has one responsibility and a readonly `implementation` name (used in diagnostics and to detect simulated output);
- is async, so a stage can run on-device, call a backend, or both;
- throws `StageNotImplementedError` if it doesn't exist yet. It must never invent data.

### Failure semantics (`RecognitionPipeline.ts`)

| Stage outcome | Optional stage | Required stage |
| --- | --- | --- |
| completes | output is used | output is used |
| `StageNotImplementedError` | recorded as `not_implemented`; a neutral fallback is used | n/a |
| any other error | recorded as `failed`, a warning is added, the fallback is used | `RecognitionError(stage)` is thrown and the scan is not saved |

Fallbacks are neutral: no quality report, no boundaries, empty OCR, empty identity (confidence 0), serial `not_analyzed`, no features. The product falls back to `productHintId` (the active product in Settings) and a warning is added.

### `RecognitionResult`

| Field | Meaning |
| --- | --- |
| `mode` / `isSimulated` / `scenarioLabel` | Which pipeline ran. `isSimulated` is true if any fixture stage produced output |
| `identity`, `identityConfidence` | Detected identity (partial) |
| `serial` | `found` (with candidates and side), `not_found`, or `not_analyzed` |
| `bestMatch`, `alternatives` | `RecognitionCandidate`s sorted by confidence; together they cover **every** variation |
| `overallConfidence` | best-match probability × identity confidence |
| `needsAnotherScan`, `captureRequests` | e.g. `{ side: 'tilt', region: 'lower-right', instruction: 'Tilt the lower-right border under light.' }` |
| `evidence`, `warnings` | Human-readable explanations |
| `stages` | Per-stage implementation, status, duration and message |

## Implementations today

| Stage | `mock` mode | `offline` mode |
| --- | --- | --- |
| ImageQualityAnalyzer | `MockImageQualityAnalyzer` (accepts captured sides) | not implemented |
| CardBoundaryDetector | `MockCardBoundaryDetector` (assumes the guide was used) | not implemented |
| OCRExtractor | `MockOCRExtractor` (scenario text, **only for captured sides**) | not implemented |
| CardIdentityResolver | `MockCardIdentityResolver` (placeholder identity) | not implemented |
| SerialNumberDetector | **`TextSerialNumberDetector` (real)** | **real** |
| VisualFeatureExtractor | `MockVisualFeatureExtractor` (scenario features) | not implemented |
| VariationCandidateResolver | `DemoRuleOverlayResolver` (DB variations + demo rules, in memory) | **`RepositoryVariationCandidateResolver` (real)** |
| VariationClassifier | **`RuleBasedVariationClassifier` (real)** | **real** |
| ConfidenceScorer | **`DefaultConfidenceScorer` (real)** | **real** |

In `offline` mode the seeded variations have no verified rules, so the classifier honestly returns a uniform distribution, an overall confidence of 0, and "needs another scan".

## Serial numbers

`serial/parseSerialNumber.ts`

- Finds `n/N` and `n of N` patterns, including unicode slashes and spacing (`23 / 50`, `23／50`).
- Normalizes to `{ raw, normalized: "4/199", number: 4, printRun: 199, printedDigits: 3, isOneOfOne, confidence }`.
- Corrects common OCR confusions (`O`/`o` → 0; `I`/`l`/`|` → 1) at lower confidence, and requires at least one real digit.
- Rejects dates (`12/31/2026`), seasons (`2025/26`), `0/N`, `n > N`, print runs above 9999, and matches glued to words.
- `TextSerialNumberDetector` searches the back first, then the front.

## Adding a real stage (example: OCR in Phase 2)

1. Implement `OCRExtractor` in `stages/`. It could be `MlKitOcrExtractor` (on-device, requires a Development Build) or `BackendOcrExtractor` (calls our backend).
2. Wire it into the `offline` branch of `createRecognitionPipeline.ts` (or add a new mode).
3. Add tests with recorded OCR fixtures.
4. Nothing else changes: the serial detector, classifier and UI already consume `OcrResult`.

## Tilt scans (Phase 5)

Already in place:

- `CaptureSide` includes `tilt`, `CaptureSet.tiltFrameUris` exists, and `CardScan.tiltCaptureUri` is stored.
- Signatures carry `requiresTilt` and a `region`. When such a signature is unobserved and no tilt capture exists, the scorer produces a `CaptureRequest` like *"Tilt the lower-right border under light."*
- The Variation Results screen passes the first request to the scan screen, which shows it over the camera.

Still to build: multi-frame capture UI, and a `VisualFeatureExtractor` that analyzes specular-highlight changes across frames to emit features such as `foil.pattern = diamond-faceted`.
