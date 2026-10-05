# Architecture

## Goals

1. **Separation of concerns.** UI, storage, recognition and (future) external APIs change independently.
2. **Data over code.** What a variation looks like is data, never `if` statements.
3. **Honesty.** Unverified metadata is marked as such, simulated output is labelled, and unimplemented stages say so instead of inventing results.
4. **Offline first.** The collection lives on the device in SQLite.
5. **Android first, nothing iOS-only.** Everything used today runs in Expo Go on Android and iOS.

## Layers

```
┌──────────────────────────────────────────────────────────────────────────┐
│ src/app (Expo Router screens) — layout + navigation only                 │
├───────────────┬──────────────────────┬──────────────────┬────────────────┤
│ features/     │ features/recognition │ features/        │ features/      │
│ scanner       │ (pipeline + stages)  │ variations       │ collection     │
│ camera, guide,│ ──────────────────►  │ (rule engine,    │ (rows, display │
│ session store │ uses engine          │  result UI)      │  helpers)      │
├───────────────┴──────────────────────┴──────────────────┴────────────────┤
│ services/  scanService (orchestration) · imageStorage · config           │
├──────────────────────────────────────────────────────────────────────────┤
│ repositories/  products · variations · cards · scans · collection        │
├──────────────────────────────────────────────────────────────────────────┤
│ db/  SqlDatabase interface · migrations · seed · expo-sqlite adapter     │
├──────────────────────────────────────────────────────────────────────────┤
│ models/  Zod schemas → TypeScript types (shared by every layer)          │
└──────────────────────────────────────────────────────────────────────────┘
```

Dependency rules:

- `models/` depends on nothing but Zod.
- `features/variations/engine` is pure TypeScript. It has no React, no storage and no Expo.
- `features/recognition` depends on interfaces. Concrete stages are wired up in one place: `createRecognitionPipeline.ts`.
- `repositories/` depend on `db/types.ts` (`SqlDatabase`), **not** on expo-sqlite. Only `db/client.ts` imports expo-sqlite.
- Screens get repositories from `useRepositories()` (provided by `DatabaseProvider`) and never write SQL.

## Key flows

### Scan → result

1. `scan/index.tsx`: `CameraPermissionGate` → `CameraCapture`. The alignment guide is a sibling view **on top of** `CameraView`, so it never appears in the photo. Captures go into `useScanSessionStore` (Zustand).
2. **Continue** calls `services/scanService.analyzeAndSaveScan()`. It:
   - copies the photos from the camera cache into `documents/scans/<scanId>/` (`imageStorage.ts`);
   - builds the pipeline for the current mode and runs it;
   - maps the result to a `CardScan` (`resultToScan`) and saves it. **Every attempt is saved**, because history is also a future evaluation dataset;
   - on failure, deletes the copied images.
3. The scan is shown on `scan/review` (loaded from SQLite by id) and `scan/variations`.
4. **Confirm** marks the scan confirmed and adds it to `collection_items`. **Correct** writes a `ScanCorrection` next to the original prediction. **Scan Again** resets the session.

### Startup

`_layout.tsx` → `DatabaseProvider` opens the DB, runs migrations, seeds the development product (idempotent; it never overwrites edited rows), and then renders the navigator. Loading and error-with-retry states are handled there. Route render errors are caught by the exported `ErrorBoundary`.

## State

| State | Where |
| --- | --- |
| Captures for the current scan, active side, pending capture request, last full pipeline result (stage diagnostics) | `features/scanner/scanSessionStore.ts` (Zustand, in memory) |
| Recognition mode, mock scenario, active product | `features/settings/settingsStore.ts` (Zustand, in memory for now) |
| Products, variations, cards, scans, collection | SQLite via repositories |
| Images | App document directory, referenced as `doc:scans/<id>/<side>.jpg` |

## Validation

Every model is a Zod schema in `src/models`, and TypeScript types are inferred from them. Repositories validate on write (`Schema.parse`) and on read. JSON columns are decoded with `parseJsonColumn`, which throws a `DataIntegrityError` rather than letting malformed data reach the UI.

## Configuration and secrets

`services/config.ts` reads `EXPO_PUBLIC_*` variables and validates them with Zod, falling back to safe defaults. These values are compiled into the app bundle and are **public**. API keys for future vision/OCR services must be held by a backend we control. The app will call that backend (`EXPO_PUBLIC_API_BASE_URL`) and never the vendor directly.

## Error, loading, empty and permission states

- `components/StateViews.tsx`: `LoadingState`, `ErrorState` (with retry), `EmptyState` (with action).
- `hooks/useAsyncData.ts`: focus-aware loading with explicit `reload` and protection against stale responses.
- Camera: checking, not granted (request), permanently denied (*Open Settings*), and mount failure.
- Pipeline: optional stages degrade to warnings; required stages fail with a `RecognitionError` naming the stage, which is shown on the scan screen.

## Testing strategy

| Test | Covers |
| --- | --- |
| `serialNumber.test.ts` | Serial parsing/normalization, OCR confusions, false-positive rejection |
| `variationScoring.test.ts` | Engine scoring, softmax, exclusions, serial/print-run rules, text rules, capture requests (with **test-only** fixture variations) |
| `models.test.ts` | Zod schemas; the seed contains no invented metadata |
| `repositories.test.ts` | Migrations, seed idempotency, scan round-trips, corrections, collection CRUD and cascades (real SQLite via `node:sqlite`) |
| `recognitionPipeline.test.ts` | End-to-end pipeline in mock and offline modes, graceful degradation |
| `appSmoke.test.tsx` | Boots the real routes with an in-memory DB: home, empty states, review/variations, settings, scan screen, DB-error screen |

## Moving to a Development Build

Expo Go is enough for Phase 1. When we need native code that Expo Go doesn't include (for example ML Kit text recognition, VisionCamera frame processors for tilt analysis, or TFLite models):

1. `npx expo install expo-dev-client <native-lib>`
2. Add the library's config plugin to `app.json` (the camera and SQLite plugins are already configured there).
3. Run `npm run android:native` (`expo run:android`, which needs Android Studio), or use EAS Build (`eas build -p android --profile development`).

Because nothing in `src/` depends on Expo Go specifically, and native work stays behind stage interfaces, this doesn't require rewriting the app. `expo prebuild` has already been verified to generate a valid Android project: package `com.cardvariant.scanner`, CAMERA permission, RECORD_AUDIO removed.
