import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { Panel } from '@/components/Panel';
import { Screen } from '@/components/Screen';
import { ErrorState, LoadingState } from '@/components/StateViews';
import { TextField } from '@/components/TextField';
import { useRepositories } from '@/db/DatabaseProvider';
import { parseSerialNumber } from '@/features/recognition';
import { getScanDisplay } from '@/features/collection/scanDisplay';
import { useFocusedAsyncData } from '@/hooks/useAsyncData';
import type { CardScan, CardVariation, ScanCorrection } from '@/models';
import { colors, radius, spacing } from '@/theme';

export default function CorrectIdentificationScreen() {
  const { scanId } = useLocalSearchParams<{ scanId: string }>();
  const repos = useRepositories();
  const data = useFocusedAsyncData(
    useCallback(async () => {
      const scan = scanId ? await repos.scans.getById(scanId) : null;
      if (!scan) throw new Error('This scan no longer exists.');
      const productId = scan.detectedIdentity.productId;
      const variations = productId ? await repos.variations.listByProduct(productId) : [];
      return { scan, variations };
    }, [repos, scanId]),
  );

  if (data.status === 'loading') return <LoadingState />;
  if (data.status === 'error') return <ErrorState error={data.error} onRetry={data.reload} />;
  return <CorrectionForm scan={data.data.scan} variations={data.data.variations} />;
}

function CorrectionForm({ scan, variations }: { scan: CardScan; variations: CardVariation[] }) {
  const repos = useRepositories();
  const current = getScanDisplay(scan);
  const identity = scan.correction?.identity ?? scan.detectedIdentity;

  const [playerName, setPlayerName] = useState(identity.playerName ?? '');
  const [team, setTeam] = useState(identity.team ?? '');
  const [year, setYear] = useState(identity.year ? String(identity.year) : '');
  const [cardNumber, setCardNumber] = useState(identity.cardNumber ?? '');
  const [insert, setInsert] = useState(identity.subsetName ?? '');
  const [rookie, setRookie] = useState(identity.rookie ?? false);
  const [serialText, setSerialText] = useState(current.serial ?? '');
  const [variationId, setVariationId] = useState<string | null>(
    scan.correction ? scan.correction.variationId : (scan.detectedVariation?.variationId ?? null),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const save = async () => {
    const nextErrors: Record<string, string> = {};
    const parsedYear = year.trim() ? Number.parseInt(year, 10) : undefined;
    if (parsedYear !== undefined && (!Number.isInteger(parsedYear) || parsedYear < 1860 || parsedYear > 2100)) {
      nextErrors.year = 'Enter a 4-digit year';
    }
    const serial = serialText.trim() ? parseSerialNumber(serialText) : null;
    if (serialText.trim() && !serial) nextErrors.serial = 'Use a format like 23/50, 004/199 or 1/1';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const variation = variations.find((v) => v.id === variationId) ?? null;
    const correction: ScanCorrection = {
      correctedAt: new Date().toISOString(),
      identity: {
        ...identity,
        playerName: playerName.trim() || undefined,
        team: team.trim() || null,
        year: parsedYear,
        cardNumber: cardNumber.trim() || undefined,
        subsetName: insert.trim() || null,
        rookie,
      },
      variationId: variation?.id ?? null,
      variationName: variation?.name ?? null,
      serialNumber: serial ? { ...serial, confidence: 1 } : null,
    };

    setSaving(true);
    setSaveError(null);
    try {
      await repos.scans.applyCorrection(scan.id, correction);
      router.back();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Could not save the correction.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen
      footer={
        <>
          {saveError ? <Text style={styles.error}>{saveError}</Text> : null}
          <AppButton label="Save Correction" icon="checkmark" size="lg" loading={saving} onPress={save} />
        </>
      }>
      <Panel title="Card">
        <TextField label="Player" value={playerName} onChangeText={setPlayerName} autoCapitalize="words" />
        <TextField label="Team" value={team} onChangeText={setTeam} autoCapitalize="words" />
        <View style={styles.row}>
          <View style={styles.flex}>
            <TextField label="Year" value={year} onChangeText={setYear} keyboardType="number-pad" maxLength={4} error={errors.year} />
          </View>
          <View style={styles.flex}>
            <TextField label="Card #" value={cardNumber} onChangeText={setCardNumber} autoCapitalize="characters" />
          </View>
        </View>
        <TextField label="Insert / subset" value={insert} onChangeText={setInsert} placeholder="Leave blank for base set" />
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Rookie card</Text>
          <Switch value={rookie} onValueChange={setRookie} accessibilityLabel="Rookie card" />
        </View>
        <TextField
          label="Serial number"
          value={serialText}
          onChangeText={setSerialText}
          placeholder="e.g. 23/50"
          autoCapitalize="none"
          error={errors.serial}
        />
      </Panel>

      <Panel title="Variation">
        {variations.length === 0 ? <Text style={styles.muted}>No variations known for this product.</Text> : null}
        <View style={styles.chips}>
          {variations.map((v) => {
            const selected = v.id === variationId;
            return (
              <Pressable
                key={v.id}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                onPress={() => setVariationId(selected ? null : v.id)}
                style={[styles.chip, selected && styles.chipSelected]}>
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{v.name}</Text>
              </Pressable>
            );
          })}
        </View>
      </Panel>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.md },
  flex: { flex: 1 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 44 },
  switchLabel: { color: colors.text, fontSize: 16 },
  muted: { color: colors.textMuted },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
  },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.text, fontWeight: '600' },
  chipTextSelected: { color: colors.onPrimary },
  error: { color: colors.danger, textAlign: 'center' },
});
