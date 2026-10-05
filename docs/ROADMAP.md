# Roadmap

Phases are delivered incrementally. Each phase ends with a working, tested app.

## Phase 1: App foundation + camera + collection + recognition interfaces ✅ *(current)*

- Expo SDK 57 + Expo Router + strict TypeScript project structure
- Camera with permissions, card alignment overlay, front/back capture, retake
- Home, Scan, Scan Review, Variation Results, Correct Identification, Collection, Card Detail, Scan History, Settings
- SQLite persistence (products, variations, cards, scans, collection) with migrations and an idempotent seed
- Zod domain models
- Recognition pipeline interfaces, with mock and not-implemented stages
- Real serial-number parser and data-driven variation rule engine
- Tests: serial parsing, variation scoring, models, repositories, pipeline, app smoke

## Phase 2: OCR and card identity recognition

- `OCRExtractor`: evaluate on-device ML Kit text recognition (Development Build) against a backend OCR/vision service. Pick based on accuracy for small foil-stamped serial numbers.
- `CardBoundaryDetector` + perspective correction, so OCR and features run on a rectified card.
- `ImageQualityAnalyzer`: blur/glare/exposure checks with an immediate "retake" prompt.
- `CardIdentityResolver`: card number + name + copyright year → checklist match (fuzzy).
- Benchmark set of real photos with expected OCR output.

## Phase 3: Verified 2026 Topps Flagship Football checklist/database

- Import the base checklist (`cards`) and every parallel/insert (`variations`) from reliable sources, recording `source`.
- Fill print runs, serial numbering and exclusivity **only** when verified.
- Author visual signatures and identification rules per variation using a frozen feature vocabulary.
- Versioned data packs (bundled or downloadable) with checksum validation.

## Phase 4: AI-assisted variation classification from front/back photos

- `VisualFeatureExtractor` producing `FeatureObservation`s: border color, finish, texture, foil pattern (where visible in a still).
- Options: an on-device classifier, or a backend vision model (e.g. an OpenAI vision API) called **through our backend** (no keys in the app). Model outputs must map into the feature vocabulary, so the rule engine stays the single decision-maker.
- Calibrate classifier temperature and feature weights on labelled scans.

## Phase 5: Tilt/multi-frame reflective foil analysis

- A guided capture that records several frames while the user tilts the card under a light, prompted by `CaptureRequest`s (e.g. *"Tilt the lower-right border under light."*).
- Frame alignment + specular highlight analysis to distinguish Holo, Diamante, Crackle, Football Leather and other foil textures.
- Probably requires VisionCamera frame processors (Development Build).

## Phase 6: User corrections and learning dataset

- The prediction is already stored alongside the user's correction. Add export tooling (images + prediction + correction) with explicit user consent.
- Evaluation dashboard: confusion matrix per variation, calibration curves.
- Exclude `isSimulated` scans from any dataset.
- Persist settings and add scan deletion and management.

## Phase 7: Market pricing and recent sales

- Pricing provider abstraction (backend-side), keyed on card identity + variation + serial numbering.
- Recent sales with dates and sources, and collection value totals.

## Phase 8: Additional sports/card products

- Generalize product selection and identity resolution across products.
- Data packs for additional sets, sports and manufacturers.
- iOS release (the architecture already avoids iOS-only or Android-only code).
