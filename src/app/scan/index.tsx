import type { CameraView } from 'expo-camera';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/AppButton';
import { useRepositories } from '@/db/DatabaseProvider';
import {
  CameraCapture,
  CameraPermissionGate,
  CaptureSideTabs,
  ShutterButton,
  useScanSessionStore,
} from '@/features/scanner';
import { useSettingsStore } from '@/features/settings/settingsStore';
import { analyzeAndSaveScan } from '@/services/scanService';
import { colors, spacing } from '@/theme';

export default function ScanScreen() {
  return (
    <CameraPermissionGate>
      <ScanCamera />
    </CameraPermissionGate>
  );
}

function ScanCamera() {
  const repos = useRepositories();
  const cameraRef = useRef<CameraView>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [mountError, setMountError] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { activeSide, captures, pendingRequest, setActiveSide, setCapture, retake, setLastResult, reset } =
    useScanSessionStore();
  const { recognitionMode, mockScenarioId, activeProductId } = useSettingsStore();

  const currentUri = captures[activeSide];
  const hasAnyCapture = Boolean(captures.front || captures.back);
  const hint = pendingRequest
    ? pendingRequest.side === 'tilt'
      ? `${pendingRequest.instruction} (Tilt video capture arrives in a later phase — take a still with light on that area.)`
      : pendingRequest.instruction
    : null;

  const capture = async () => {
    if (!cameraRef.current || !cameraReady) return;
    setCapturing(true);
    setError(null);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.9, exif: false });
      if (!photo?.uri) throw new Error('The camera did not return a photo.');
      setCapture(activeSide, photo.uri);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not take the photo.');
    } finally {
      setCapturing(false);
    }
  };

  const analyze = async () => {
    setAnalyzing(true);
    setError(null);
    try {
      const { scan, result } = await analyzeAndSaveScan(repos, {
        frontUri: captures.front,
        backUri: captures.back,
        productId: activeProductId,
        mode: recognitionMode,
        mockScenarioId,
      });
      setLastResult(scan.id, result);
      reset();
      router.replace({ pathname: '/scan/review', params: { scanId: scan.id } });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Recognition failed.');
    } finally {
      setAnalyzing(false);
    }
  };

  const sideLabel = activeSide.toUpperCase();

  return (
    <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
      <View style={styles.tabs}>
        <CaptureSideTabs
          active={activeSide}
          captured={{ front: Boolean(captures.front), back: Boolean(captures.back) }}
          onChange={setActiveSide}
        />
      </View>

      <CameraCapture
        ref={cameraRef}
        sideLabel={sideLabel}
        capturedUri={currentUri}
        hint={hint}
        mountError={mountError}
        onReady={() => setCameraReady(true)}
        onMountError={setMountError}
      />

      <View style={styles.controls}>
        {error ? (
          <Text style={styles.error} accessibilityRole="alert">
            {error}
          </Text>
        ) : null}

        <View style={styles.shutterRow}>
          {currentUri ? (
            <AppButton label={`Retake ${activeSide}`} icon="refresh" variant="secondary" onPress={() => retake(activeSide)} />
          ) : (
            <ShutterButton onPress={capture} busy={capturing} disabled={!cameraReady || Boolean(mountError) || analyzing} />
          )}
        </View>

        <AppButton
          label={analyzing ? 'Analyzing…' : 'Continue'}
          icon="arrow-forward"
          size="lg"
          loading={analyzing}
          disabled={!hasAnyCapture}
          onPress={analyze}
          accessibilityHint="Runs recognition on the captured photos"
        />
        {!hasAnyCapture ? (
          <Text style={styles.helper}>Capture the front (and ideally the back) to continue.</Text>
        ) : !captures.back ? (
          <Text style={styles.helper}>Tip: the back often carries the serial number.</Text>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  tabs: { paddingVertical: spacing.md },
  controls: { padding: spacing.lg, gap: spacing.md },
  shutterRow: { alignItems: 'center', minHeight: 84, justifyContent: 'center' },
  error: { color: colors.danger, textAlign: 'center', fontWeight: '600' },
  helper: { color: colors.textMuted, textAlign: 'center', fontSize: 14 },
});
