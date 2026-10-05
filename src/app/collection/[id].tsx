import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { CardImage } from '@/components/CardImage';
import { InfoRow } from '@/components/InfoRow';
import { Panel } from '@/components/Panel';
import { Screen } from '@/components/Screen';
import { ErrorState, LoadingState } from '@/components/StateViews';
import { useRepositories } from '@/db/DatabaseProvider';
import { getScanDisplay, STATUS_LABELS } from '@/features/collection/scanDisplay';
import { formatSerialNumber } from '@/features/recognition';
import { SimulatedBanner } from '@/features/recognition/components/SimulatedBanner';
import { EvidenceList } from '@/features/variations/components/EvidenceList';
import { useFocusedAsyncData } from '@/hooks/useAsyncData';
import { colors, font, spacing } from '@/theme';
import { formatDateTime, formatPercent } from '@/utils/format';

export default function CardDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const repos = useRepositories();
  const { width } = useWindowDimensions();
  const [removing, setRemoving] = useState(false);
  const data = useFocusedAsyncData(
    useCallback(async () => {
      const entry = id ? await repos.collection.getById(id) : null;
      if (!entry) throw new Error('This card is no longer in your collection.');
      return entry;
    }, [repos, id]),
  );

  if (data.status === 'loading') return <LoadingState />;
  if (data.status === 'error') return <ErrorState error={data.error} onRetry={data.reload} />;

  const entry = data.data;
  const { scan } = entry;
  const d = getScanDisplay(scan);
  const identity = scan.correction?.identity ?? scan.detectedIdentity;
  const imageWidth = (width - spacing.lg * 2 - spacing.md) / 2;

  const remove = () =>
    Alert.alert('Remove from collection?', 'The scan stays in Scan History.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          setRemoving(true);
          try {
            await repos.collection.remove(entry.id);
            router.back();
          } catch (e) {
            setRemoving(false);
            Alert.alert('Could not remove card', e instanceof Error ? e.message : String(e));
          }
        },
      },
    ]);

  return (
    <Screen>
      <SimulatedBanner visible={scan.isSimulated} />
      <View style={styles.header}>
        <Text style={font.heading}>{d.playerName ?? 'Unknown player'}</Text>
        <Text style={styles.variation}>
          {d.variationName ?? 'Variation unknown'}
          {d.serial ? `  ·  ${d.serial}` : ''}
        </Text>
      </View>

      <View style={styles.images}>
        <CardImage uri={scan.frontImageUri} width={imageWidth} label="Front" />
        <CardImage uri={scan.backImageUri} width={imageWidth} label="Back" />
      </View>

      <Panel title="Card">
        <InfoRow label="Player" value={d.playerName} />
        <InfoRow label="Team" value={d.team} />
        <InfoRow label="Year" value={d.year} />
        <InfoRow label="Manufacturer" value={identity.manufacturer} />
        <InfoRow label="Product" value={d.product} />
        <InfoRow label="Set" value={d.setName} />
        <InfoRow label="Insert / subset" value={d.insert} />
        <InfoRow label="Card #" value={d.cardNumber} />
        <InfoRow label="Rookie" value={identity.rookie === undefined ? null : identity.rookie ? 'Yes' : 'No'} />
        <InfoRow label="Sport" value={identity.sport} />
      </Panel>

      <Panel title="Variation">
        <InfoRow label="Variation" value={d.variationName} emphasize />
        <InfoRow label="Serial number" value={d.serial ?? 'None'} />
        <InfoRow label="Confidence" value={formatPercent(scan.confidence)} />
        <EvidenceList items={scan.evidence} kind="evidence" />
        <AppButton
          label="View Variation Analysis"
          icon="analytics-outline"
          variant="ghost"
          onPress={() => router.push({ pathname: '/scan/variations', params: { scanId: scan.id } })}
        />
      </Panel>

      {scan.correction ? (
        <Panel title="Original prediction">
          <InfoRow label="Player" value={scan.detectedIdentity.playerName} />
          <InfoRow label="Card #" value={scan.detectedIdentity.cardNumber} />
          <InfoRow label="Variation" value={scan.detectedVariation?.name} />
          <InfoRow label="Serial" value={scan.serialNumber ? formatSerialNumber(scan.serialNumber) : null} />
          <InfoRow label="Corrected" value={formatDateTime(scan.correction.correctedAt)} />
        </Panel>
      ) : null}

      <Panel title="Record">
        <InfoRow label="Status" value={STATUS_LABELS[d.status]} />
        <InfoRow label="Scanned" value={formatDateTime(scan.createdAt)} />
        <InfoRow label="Added" value={formatDateTime(entry.addedAt)} />
        <InfoRow label="Recognition" value={`${scan.recognitionMode}${scan.isSimulated ? ' (simulated)' : ''}`} />
        <InfoRow label="Scan ID" value={scan.id} />
      </Panel>

      <AppButton
        label="Correct Identification"
        icon="create-outline"
        variant="secondary"
        onPress={() => router.push({ pathname: '/scan/correct', params: { scanId: scan.id } })}
      />
      <AppButton label="Remove from Collection" icon="trash-outline" variant="danger" loading={removing} onPress={remove} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.xs },
  variation: { color: colors.accent, fontSize: 18, fontWeight: '700' },
  images: { flexDirection: 'row', gap: spacing.md },
});
