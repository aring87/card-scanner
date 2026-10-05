import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { Banner } from '@/components/Banner';
import { CardImage } from '@/components/CardImage';
import { Screen } from '@/components/Screen';
import { ErrorState, LoadingState } from '@/components/StateViews';
import { useRepositories } from '@/db/DatabaseProvider';
import { RecognitionSummary } from '@/features/recognition/components/RecognitionSummary';
import { SimulatedBanner } from '@/features/recognition/components/SimulatedBanner';
import { StageReportList } from '@/features/recognition/components/StageReportList';
import { useScanSessionStore } from '@/features/scanner';
import { useScan } from '@/hooks/useScan';
import { colors, font, spacing } from '@/theme';

export default function ScanReviewScreen() {
  const { scanId } = useLocalSearchParams<{ scanId: string }>();
  const repos = useRepositories();
  const { width } = useWindowDimensions();
  const data = useScan(scanId);
  const lastResult = useScanSessionStore((s) => s.lastResult);
  const resetSession = useScanSessionStore((s) => s.reset);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (data.status === 'loading') return <LoadingState message="Loading scan…" />;
  if (data.status === 'error') return <ErrorState error={data.error} onRetry={data.reload} />;

  const { scan, collectionItem } = data.data;
  const pipeline = lastResult?.scanId === scan.id ? lastResult.result : null;
  const imageWidth = (width - spacing.lg * 2 - spacing.md) / 2;

  const confirm = async () => {
    setSaving(true);
    setError(null);
    try {
      await repos.scans.markConfirmed(scan.id);
      const item = await repos.collection.add(scan.id);
      router.replace({ pathname: '/collection/[id]', params: { id: item.id } });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save to your collection.');
    } finally {
      setSaving(false);
    }
  };

  const scanAgain = () => {
    resetSession();
    router.replace('/scan');
  };

  return (
    <Screen
      footer={
        <>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {collectionItem ? (
            <AppButton
              label="View in Collection"
              icon="albums-outline"
              size="lg"
              onPress={() => router.push({ pathname: '/collection/[id]', params: { id: collectionItem.id } })}
            />
          ) : (
            <AppButton label="Confirm" icon="checkmark" size="lg" loading={saving} onPress={confirm} />
          )}
          <View style={styles.row}>
            <View style={styles.flex}>
              <AppButton
                label="Correct"
                icon="create-outline"
                variant="secondary"
                onPress={() => router.push({ pathname: '/scan/correct', params: { scanId: scan.id } })}
                accessibilityHint="Correct the identification"
              />
            </View>
            <View style={styles.flex}>
              <AppButton label="Scan Again" icon="camera-outline" variant="secondary" onPress={scanAgain} />
            </View>
          </View>
        </>
      }>
      <SimulatedBanner visible={scan.isSimulated} />
      {scan.userCorrected ? (
        <Banner tone="info" title="Corrected by you" message="Your correction is shown; the original prediction is kept for review." />
      ) : null}

      <View style={styles.images}>
        <View style={styles.imageCol}>
          <CardImage uri={scan.frontImageUri} width={imageWidth} label="Front" />
          <Text style={font.caption}>Front</Text>
        </View>
        <View style={styles.imageCol}>
          <CardImage uri={scan.backImageUri} width={imageWidth} label="Back" />
          <Text style={font.caption}>Back</Text>
        </View>
      </View>

      <RecognitionSummary scan={scan} />

      <AppButton
        label="View Variation Analysis"
        icon="analytics-outline"
        variant="ghost"
        onPress={() => router.push({ pathname: '/scan/variations', params: { scanId: scan.id } })}
      />

      {pipeline ? <StageReportList stages={pipeline.stages} /> : null}
      {pipeline && pipeline.warnings.length > 0 ? (
        <Banner tone="info" title="Notes" message={pipeline.warnings.join('\n')} />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  images: { flexDirection: 'row', gap: spacing.md },
  imageCol: { alignItems: 'center', gap: spacing.xs },
  row: { flexDirection: 'row', gap: spacing.sm },
  flex: { flex: 1 },
  error: { color: colors.danger, textAlign: 'center' },
});
