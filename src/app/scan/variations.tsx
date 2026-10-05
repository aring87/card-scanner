import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { Panel } from '@/components/Panel';
import { Screen } from '@/components/Screen';
import { ErrorState, LoadingState } from '@/components/StateViews';
import { SimulatedBanner } from '@/features/recognition/components/SimulatedBanner';
import { useScanSessionStore } from '@/features/scanner';
import { AlternativeRow } from '@/features/variations/components/AlternativeRow';
import { BestMatchCard } from '@/features/variations/components/BestMatchCard';
import { CaptureRequestList } from '@/features/variations/components/CaptureRequestList';
import { useScan } from '@/hooks/useScan';
import { CONFIDENT_MATCH_THRESHOLD, font } from '@/theme';

const INITIAL_ALTERNATIVES = 4;

export default function VariationResultsScreen() {
  const { scanId } = useLocalSearchParams<{ scanId: string }>();
  const data = useScan(scanId);
  const [showAll, setShowAll] = useState(false);
  const resetSession = useScanSessionStore((s) => s.reset);
  const setPendingRequest = useScanSessionStore((s) => s.setPendingRequest);

  if (data.status === 'loading') return <LoadingState message="Loading analysis…" />;
  if (data.status === 'error') return <ErrorState error={data.error} onRetry={data.reload} />;

  const { scan } = data.data;
  const best = scan.detectedVariation;
  const alternatives = showAll ? scan.alternatives : scan.alternatives.slice(0, INITIAL_ALTERNATIVES);
  const uncertain = !best || best.confidence < CONFIDENT_MATCH_THRESHOLD || scan.captureRequests.length > 0;

  const rescan = () => {
    resetSession();
    setPendingRequest(scan.captureRequests[0] ?? null);
    router.push('/scan');
  };

  return (
    <Screen>
      <SimulatedBanner visible={scan.isSimulated} />
      <BestMatchCard candidate={best} />

      <Panel title="Possible alternatives">
        {scan.alternatives.length === 0 ? <Text style={font.caption}>No other variations were considered.</Text> : null}
        {alternatives.map((c) => (
          <AlternativeRow key={c.variationId} candidate={c} />
        ))}
        {scan.alternatives.length > INITIAL_ALTERNATIVES ? (
          <AppButton
            label={showAll ? 'Show fewer' : `Show all ${scan.alternatives.length}`}
            variant="ghost"
            onPress={() => setShowAll((v) => !v)}
          />
        ) : null}
      </Panel>

      <Panel title="Need another scan?">
        {scan.captureRequests.length > 0 ? (
          <CaptureRequestList requests={scan.captureRequests} />
        ) : (
          <Text style={font.caption}>
            {uncertain
              ? 'The result is uncertain. A sharper photo with even lighting, including the back, may help.'
              : 'No additional capture requested for this result.'}
          </Text>
        )}
        <AppButton
          label={uncertain ? 'Scan Again' : 'Scan Again Anyway'}
          icon="camera-outline"
          variant={uncertain ? 'primary' : 'secondary'}
          onPress={rescan}
        />
      </Panel>
    </Screen>
  );
}
