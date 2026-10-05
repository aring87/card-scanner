# CardVariant Scanner

A mobile app for scanning sports trading cards and identifying the **exact variation/parallel**, not just the base card.

Most scanner apps get the player, set and card number right but miss subtle variants such as Holo Foil, Diamante Foil, Football Leather Foil, Crackle Foil, numbered color parallels and insert parallels. CardVariant Scanner is designed around that problem. It compares front, back and (later) tilt captures against a **data-driven** description of every known variation of a product, and it explains its answer with evidence.

> **Status: Phase 1 (foundation).** The camera, local collection, data model, recognition pipeline interfaces and variation rule engine all work. There is **no real OCR or computer vision yet**. In the default *mock* mode, results are simulated from development fixtures and the app labels them that way.

First target product (eventually): **2026 Topps Flagship Football**.

---

## Technology stack

| Concern | Choice |
| --- | --- |
| App framework | React Native 0.86 + **Expo SDK 57** (TypeScript, strict) |
| Navigation | **Expo Router** (file-based, `src/app/`) |
| Camera | **expo-camera** (`CameraView`) |
| Local storage | **expo-sqlite** (+ `expo-file-system` for captured images) |
| App state | **Zustand** (scan session, settings) |
| Validation | **Zod v4** (all domain models, DB row decoding) |
| Images | expo-image |
| Tests | Jest (`jest-expo`), React Native Testing Library, Node's built-in `node:sqlite` |
| Lint | ESLint 9 + `eslint-config-expo` |

Every dependency is Expo-compatible and runs in **Expo Go**. No custom native code is needed yet. The project is already set up for an Expo **Development Build** (`expo prebuild` / `expo run:android`) for when native modules are needed, such as on-device OCR or ML. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#moving-to-a-development-build).

---

## Setup on Windows

### 1. Install prerequisites

1. **Node.js 22 LTS** (22.13 or newer) from <https://nodejs.org>. Node 20.19+ also runs the app, but the database tests need Node 22.13+ and are skipped on older versions.
2. **Git for Windows**: <https://git-scm.com/download/win>.
3. On your Android phone, install **Expo Go** from the Google Play Store. It must support SDK 57, which the current Play Store version does.
4. *(Optional, only needed for Development Builds later)* Android Studio, with an SDK and the `ANDROID_HOME` environment variable set.

### 2. Clone and install

```powershell
git clone https://github.com/aring87/card-scanner.git
cd card-scanner
npm install
```

### 3. (Optional) Environment variables

```powershell
copy .env.example .env.local
```

| Variable | Default | Meaning |
| --- | --- | --- |
| `EXPO_PUBLIC_RECOGNITION_MODE` | `mock` | `mock` (fixtures, so every screen can be exercised) or `offline` (real stages only; OCR/vision are not implemented yet) |
| `EXPO_PUBLIC_API_BASE_URL` | *(empty)* | The future recognition backend. Unused in Phase 1. |

`EXPO_PUBLIC_*` values are compiled into the app and anyone with the APK can read them. **Never put API keys or secrets in them.** Future vision-API keys will live on a backend.

### 4. Verify

```powershell
npm run check      # typecheck + lint + tests
```

---

## Running on your Android phone

1. Connect the phone and the PC to the **same Wi-Fi network**.
2. Start the dev server:
   ```powershell
   npm start
   ```
3. Open **Expo Go** on the phone and tap **Scan QR code**, then scan the QR code shown in the terminal.
4. The first load bundles the JavaScript, which takes about 20–60 s. After that, edits reload instantly.
5. When asked, allow camera access.

**If the phone can't connect:**

- Windows Firewall: allow **Node.js** on *Private* networks (Windows shows a prompt the first time). Also make sure your Wi-Fi profile is set to *Private*, not *Public*.
- Guest or corporate Wi-Fi often blocks device-to-device traffic. Use tunnel mode instead: `npm run android:tunnel`. The first time, it offers to install `@expo/ngrok`.
- USB alternative, which needs Android platform-tools: enable USB debugging, connect the phone, run `adb reverse tcp:8081 tcp:8081`, then `npm start` and press `a`.

`npm run android` runs `expo start --android`, which opens Expo Go on a USB-connected device or a running emulator automatically.

---

## What works today

| Area | Status |
| --- | --- |
| Home screen with scan count, collection count, and Scan / Collection / History buttons | ✅ |
| Live camera preview with a 2.5 × 3.5 card alignment guide. The guide is an overlay and **never appears in the photo** | ✅ |
| FRONT / BACK tabs, capture, retake, Continue | ✅ |
| Permission handling: first request, denied (with *Open Settings*), and camera mount errors | ✅ |
| Captured photos copied from cache into permanent app storage | ✅ |
| Recognition pipeline with 9 pluggable stages, per-stage diagnostics and graceful degradation | ✅ |
| Serial-number parsing (`23/50`, `004/199`, `4/10`, `1/1`, `1 of 1`, OCR confusions like `O4/1O`) | ✅ real logic, tested |
| Data-driven variation rule engine: scores **every** variation of the product, returns ranked candidates with evidence, conflicts and missing evidence, and decides when to ask for another capture (e.g. *"Tilt the lower-right border under light."*) | ✅ real logic, tested |
| Scan Review screen (front/back images, Player, Year, Product, Card #, Insert, Variation, Serial, Confidence; Confirm / Correct / Scan Again) | ✅ |
| Variation Results screen (best match, evidence, alternatives, "Need another scan?") | ✅ |
| Correct Identification form. The correction is stored *next to* the original prediction | ✅ |
| Collection list, Card Detail, Scan History (all offline, in SQLite) | ✅ |
| Settings (camera permission status, recognition mode, mock scenario picker, product data status, app version) | ✅ |
| OCR, card boundary detection, image quality analysis, visual feature extraction | ⛔ interfaces only. In `offline` mode they report `not_implemented` |
| Verified 2026 Topps Flagship Football checklist | ⛔ only **13 placeholder variation names** are seeded, all marked `unverified` |
| Tilt / multi-frame capture | ⛔ the architecture anticipates it (capture side `tilt`, `requiresTilt` signatures, tilt capture requests); capture is not built yet |

### Mock mode (default)

Mock mode lets you exercise every screen before any vision model exists. Mock stages supply fixture OCR text, a placeholder identity and visual features. These feed the **real** serial detector, variation classifier and confidence scorer. You can pick the scenario in **Settings → Mock scenario**:

| Scenario | What you'll see |
| --- | --- |
| Clear foil match | Football Leather Foil ≈ 96%, no extra capture needed |
| Foil type unclear | Four foils tied. Asks you to tilt the card |
| Serial-numbered parallel | Serial `23/50` read from the back. Parallel stays uncertain because print runs are unverified |
| Base card | Base ≈ 85% |

These percentages are **not hard-coded**. They come from scoring the fixture features against demo rules in `src/features/recognition/mock/demoRules.ts`. Those demo rules are invented, are never written to the database, and make every result they touch display **"Simulated result"**.

---

## Project architecture

```
src/
  app/                 Expo Router screens (thin; compose features + components)
    index.tsx            Home
    scan/index.tsx       Camera + capture
    scan/review.tsx      Scan Review
    scan/variations.tsx  Variation Results
    scan/correct.tsx     Correct Identification
    collection/          Collection list + [id] Card Detail
    history.tsx          Scan History
    settings.tsx         Settings
  components/          Reusable UI (buttons, panels, state views, card image…)
  features/
    scanner/           Camera, alignment overlay, capture session store
    recognition/       Pipeline, stage interfaces, real + mock stages, serial parser
    variations/        Rule-based variation engine + result components
    collection/        List rows, display helpers (prediction vs. correction)
    settings/          Settings store
  models/              Zod schemas + inferred TypeScript types
  db/                  SQLite client, migrations, seed, DatabaseProvider
  repositories/        Products, variations, cards, scans, collection
  services/            Config/env, image storage, scan orchestration
  hooks/               Data-loading hooks
  theme/  utils/
tests/                 Jest tests
docs/                  Architecture, pipeline, variation engine, roadmap
```

The layers are kept separate. **Screens** never touch SQL. **Repositories** depend on a tiny `SqlDatabase` interface rather than on expo-sqlite, so they run against Node's SQLite in tests. **Recognition** depends only on interfaces, and the **variation engine** contains no variation-specific code. Details: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Recognition pipeline

```
ImageQualityAnalyzer → CardBoundaryDetector → OCRExtractor → CardIdentityResolver →
SerialNumberDetector → VisualFeatureExtractor → VariationCandidateResolver →
VariationClassifier → ConfidenceScorer → RecognitionResult
```

Each stage is a single-purpose interface, so implementations can be swapped independently: on-device ML, a cloud vision API, or heuristics. Details: [docs/RECOGNITION_PIPELINE.md](docs/RECOGNITION_PIPELINE.md).

## Variation engine

There are no rules like `if shiny → Holo Foil`. Each variation is **data**: visual signatures (feature predicates with region, weight and a `requiresTilt` flag) plus identification rules (serial numbering / print run, excluded features, required text). The classifier scores observed evidence against **every** variation of the product, turns the scores into a probability distribution, and explains each candidate. Details: [docs/VARIATION_ENGINE.md](docs/VARIATION_ENGINE.md).

## Database

SQLite, opened on startup by `DatabaseProvider`. It runs versioned migrations (`PRAGMA user_version`) and then seeds idempotently.

| Table | Purpose |
| --- | --- |
| `products` | One row per product/set (seeded: 2026 Topps Flagship Football, *unverified*) |
| `variations` | Every variation/parallel of a product, with signatures and rules stored as validated JSON |
| `cards` | Checklist entries (card identities). Empty until Phase 3 |
| `scans` | Every scan attempt: image references, prediction, evidence, alternatives, capture requests, mode, simulated flag, confirmation, and correction stored **alongside** the original prediction |
| `collection_items` | Scans the user confirmed into their collection (cascade-deleted with the scan) |

Images live in the app's document directory under `scans/<scanId>/`. The database stores relative references (`doc:scans/<id>/front.jpg`) so that iOS container path changes can't break them later.

## Scripts

| Command | What it does |
| --- | --- |
| `npm start` | Start the Expo dev server (scan the QR code with Expo Go) |
| `npm run android` | Start and open on a connected Android device/emulator via Expo Go |
| `npm run android:tunnel` | Same, through a tunnel (for restrictive networks) |
| `npm run android:native` | Build and run a native Development Build (needs Android Studio; not needed yet) |
| `npm run typecheck` | `tsc --noEmit` (strict) |
| `npm run lint` | ESLint |
| `npm test` | Jest |
| `npm run check` | typecheck + lint + test |

## Planned phases

1. **App foundation + camera + collection + recognition interfaces** ← *current*
2. OCR and card identity recognition
3. Verified 2026 Topps Flagship Football checklist/database
4. AI-assisted variation classification from front/back photos
5. Tilt/multi-frame reflective foil analysis
6. User corrections and learning dataset
7. Market pricing and recent sales
8. Additional sports/card products

See [docs/ROADMAP.md](docs/ROADMAP.md).

## Known limitations

- Recognition is simulated (mock) or undetermined (offline) until Phase 2/4 stages exist.
- Settings (recognition mode, mock scenario) are in memory and reset when the app restarts.
- No thumbnail generation yet. Lists downsample the full photo with expo-image.
- Scans that are never confirmed stay in history, and you can't delete them from the UI yet.
- Database tests need Node 22.13+ (`node:sqlite`) and are skipped on older Node versions.
