import { CameraView } from 'expo-camera';
import { Image } from 'expo-image';
import { useIsFocused } from 'expo-router';
import type { Ref } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing } from '@/theme';

import { CardAlignmentOverlay } from './CardAlignmentOverlay';

type Props = {
  ref?: Ref<CameraView>;
  sideLabel: string;
  capturedUri: string | null;
  hint?: string | null;
  mountError: string | null;
  onReady: () => void;
  onMountError: (message: string) => void;
};

/**
 * Live camera preview + alignment guide, or the captured still for the current side.
 * The camera stays mounted while a still is shown so switching sides is instant, but it is
 * released whenever the screen loses focus.
 */
export function CameraCapture({ ref, sideLabel, capturedUri, hint, mountError, onReady, onMountError }: Props) {
  const focused = useIsFocused();

  return (
    <View style={styles.container}>
      {focused && !mountError ? (
        <CameraView
          ref={ref}
          style={StyleSheet.absoluteFill}
          facing="back"
          mode="picture"
          animateShutter
          onCameraReady={onReady}
          onMountError={(e) => onMountError(e.message)}
        />
      ) : null}

      {mountError ? (
        <View style={styles.error}>
          <Text style={styles.errorTitle}>Camera unavailable</Text>
          <Text style={styles.errorBody}>{mountError}</Text>
        </View>
      ) : null}

      {capturedUri ? (
        <View style={[StyleSheet.absoluteFill, styles.preview]}>
          <Image source={{ uri: capturedUri }} style={StyleSheet.absoluteFill} contentFit="contain" />
          <View style={styles.capturedTag}>
            <Text style={styles.capturedText}>{sideLabel} CAPTURED</Text>
          </View>
        </View>
      ) : (
        <CardAlignmentOverlay label={`Align ${sideLabel} inside the frame`} hint={hint} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', overflow: 'hidden' },
  preview: { backgroundColor: '#000' },
  capturedTag: {
    position: 'absolute',
    top: spacing.md,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 8,
  },
  capturedText: { color: colors.success, fontWeight: '800', letterSpacing: 1 },
  error: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.sm },
  errorTitle: { color: colors.danger, fontSize: 18, fontWeight: '700' },
  errorBody: { color: colors.textMuted, textAlign: 'center' },
});
