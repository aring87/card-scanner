import { create } from 'zustand';

import { TOPPS_FLAGSHIP_FOOTBALL_2026_ID } from '@/db/seed/toppsFlagshipFootball2026';
import type { MockScenarioId } from '@/features/recognition';
import type { RecognitionMode } from '@/models';
import { config } from '@/services/config';

type SettingsState = {
  recognitionMode: RecognitionMode;
  mockScenarioId: MockScenarioId;
  /** The product the recognizer assumes until identity resolution can detect it (Phase 2). */
  activeProductId: string;
  setRecognitionMode: (mode: RecognitionMode) => void;
  setMockScenarioId: (id: MockScenarioId) => void;
};

/** In-memory for Phase 1; move to a settings table/SecureStore when settings matter across restarts. */
export const useSettingsStore = create<SettingsState>((set) => ({
  recognitionMode: config.recognitionMode,
  mockScenarioId: 'leather-foil',
  activeProductId: TOPPS_FLAGSHIP_FOOTBALL_2026_ID,
  setRecognitionMode: (recognitionMode) => set({ recognitionMode }),
  setMockScenarioId: (mockScenarioId) => set({ mockScenarioId }),
}));
