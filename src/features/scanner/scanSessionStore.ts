import { create } from 'zustand';

import type { RecognitionResult } from '@/features/recognition';
import type { CaptureRequest } from '@/models';

export type CaptureSide = 'front' | 'back';

type ScanSessionState = {
  activeSide: CaptureSide;
  captures: Record<CaptureSide, string | null>;
  /** Shown over the camera when the recognizer asked for a specific re-capture. */
  pendingRequest: CaptureRequest | null;
  /** Full pipeline output of the most recent analysis (stage diagnostics aren't persisted). */
  lastResult: { scanId: string; result: RecognitionResult } | null;

  setActiveSide: (side: CaptureSide) => void;
  setCapture: (side: CaptureSide, uri: string) => void;
  retake: (side: CaptureSide) => void;
  setPendingRequest: (request: CaptureRequest | null) => void;
  setLastResult: (scanId: string, result: RecognitionResult) => void;
  reset: () => void;
};

const initial = {
  activeSide: 'front' as CaptureSide,
  captures: { front: null, back: null },
  pendingRequest: null,
  lastResult: null,
};

export const useScanSessionStore = create<ScanSessionState>((set) => ({
  ...initial,
  setActiveSide: (side) => set({ activeSide: side }),
  setCapture: (side, uri) =>
    set((state) => ({
      captures: { ...state.captures, [side]: uri },
      // After capturing the front, move straight on to the back if it's still empty.
      activeSide: side === 'front' && !state.captures.back ? 'back' : side,
    })),
  retake: (side) => set((state) => ({ captures: { ...state.captures, [side]: null }, activeSide: side })),
  setPendingRequest: (pendingRequest) => set({ pendingRequest }),
  setLastResult: (scanId, result) => set({ lastResult: { scanId, result } }),
  reset: () => set({ activeSide: 'front', captures: { front: null, back: null }, pendingRequest: null }),
}));
