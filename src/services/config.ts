import Constants from 'expo-constants';
import { z } from 'zod';

import { RecognitionModeSchema } from '@/models';

/*
 * Runtime configuration. Only EXPO_PUBLIC_* variables are inlined into the bundle, and they are
 * readable by anyone with the APK, so this must never contain secrets. Each variable has to be
 * referenced literally (process.env.EXPO_PUBLIC_X) for Expo to inline it.
 */
const EnvSchema = z.object({
  recognitionMode: RecognitionModeSchema.catch('mock'),
  apiBaseUrl: z.url().nullable().catch(null),
});

export const config = EnvSchema.parse({
  recognitionMode: process.env.EXPO_PUBLIC_RECOGNITION_MODE || 'mock',
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL || null,
});

export const appVersion: string = Constants.expoConfig?.version ?? 'unknown';
