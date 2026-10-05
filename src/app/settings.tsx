import { useCameraPermissions } from 'expo-camera';
import { useCallback } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { InfoRow } from '@/components/InfoRow';
import { Panel } from '@/components/Panel';
import { Screen } from '@/components/Screen';
import { useRepositories } from '@/db/DatabaseProvider';
import { SCHEMA_VERSION } from '@/db/migrations';
import { MOCK_SCENARIO_IDS, MOCK_SCENARIOS } from '@/features/recognition';
import { useSettingsStore } from '@/features/settings/settingsStore';
import { useFocusedAsyncData } from '@/hooks/useAsyncData';
import type { RecognitionMode } from '@/models';
import { appVersion, config } from '@/services/config';
import { colors, radius, spacing } from '@/theme';

const MODES: { id: RecognitionMode; label: string; description: string }[] = [
  {
    id: 'mock',
    label: 'Mock (development)',
    description: 'Fixture data drives the pipeline so every screen can be exercised. Results are labelled simulated.',
  },
  {
    id: 'offline',
    label: 'Offline engine',
    description: 'Real stages only. OCR and vision are not implemented yet, so results will be undetermined.',
  },
];

export default function SettingsScreen() {
  const repos = useRepositories();
  const [permission, requestPermission] = useCameraPermissions();
  const { recognitionMode, mockScenarioId, activeProductId, setRecognitionMode, setMockScenarioId } =
    useSettingsStore();

  const product = useFocusedAsyncData(
    useCallback(async () => {
      const [p, variations, scans] = await Promise.all([
        repos.products.getById(activeProductId),
        repos.variations.listByProduct(activeProductId),
        repos.scans.count(),
      ]);
      return {
        product: p,
        variationCount: variations.length,
        verifiedCount: variations.filter((v) => v.verificationStatus === 'verified').length,
        scans,
      };
    }, [repos, activeProductId]),
  );

  const cameraStatus = !permission
    ? 'Checking…'
    : permission.granted
      ? 'Granted'
      : permission.canAskAgain
        ? 'Not granted'
        : 'Denied (change in system settings)';

  return (
    <Screen>
      <Panel title="Camera">
        <InfoRow label="Permission" value={cameraStatus} />
        {permission && !permission.granted ? (
          permission.canAskAgain ? (
            <AppButton label="Allow Camera" icon="camera" onPress={() => void requestPermission()} />
          ) : (
            <AppButton label="Open System Settings" icon="settings-outline" onPress={() => void Linking.openSettings()} />
          )
        ) : null}
      </Panel>

      <Panel title="Recognition mode">
        {MODES.map((m) => (
          <Option
            key={m.id}
            selected={recognitionMode === m.id}
            label={m.label}
            description={m.description}
            onPress={() => setRecognitionMode(m.id)}
          />
        ))}
      </Panel>

      {recognitionMode === 'mock' ? (
        <Panel title="Mock scenario">
          {MOCK_SCENARIO_IDS.map((id) => (
            <Option
              key={id}
              selected={mockScenarioId === id}
              label={MOCK_SCENARIOS[id].label}
              description={MOCK_SCENARIOS[id].description}
              onPress={() => setMockScenarioId(id)}
            />
          ))}
        </Panel>
      ) : null}

      <Panel title="Product data">
        <InfoRow
          label="Active product"
          value={product.data?.product ? `${product.data.product.year} ${product.data.product.name}` : '—'}
        />
        <InfoRow label="Variations" value={product.data ? product.data.variationCount : '—'} />
        <InfoRow label="Verified" value={product.data ? product.data.verifiedCount : '—'} />
        <Text style={styles.note}>
          Development placeholder: variation names only. Print runs, odds and visual signatures are unverified and
          intentionally empty.
        </Text>
      </Panel>

      <Panel title="About">
        <InfoRow label="App version" value={appVersion} />
        <InfoRow label="Database schema" value={`v${SCHEMA_VERSION}`} />
        <InfoRow label="Scans stored" value={product.data?.scans ?? '—'} />
        <InfoRow label="Backend API" value={config.apiBaseUrl ? 'Configured' : 'Not configured'} />
      </Panel>
    </Screen>
  );
}

function Option({
  selected,
  label,
  description,
  onPress,
}: {
  selected: boolean;
  label: string;
  description: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.option, selected && styles.optionSelected]}>
      <View style={[styles.radio, selected && styles.radioSelected]} />
      <View style={styles.optionText}>
        <Text style={styles.optionLabel}>{label}</Text>
        <Text style={styles.optionDescription}>{description}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  note: { color: colors.textMuted, fontSize: 13 },
  option: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'flex-start',
  },
  optionSelected: { borderColor: colors.primary, backgroundColor: colors.surfaceRaised },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.textMuted, marginTop: 2 },
  radioSelected: { borderColor: colors.primary, backgroundColor: colors.primary },
  optionText: { flex: 1, gap: 2 },
  optionLabel: { color: colors.text, fontSize: 16, fontWeight: '700' },
  optionDescription: { color: colors.textMuted, fontSize: 14 },
});
