import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/AppButton';
import { useRepositories } from '@/db/DatabaseProvider';
import { useScanSessionStore } from '@/features/scanner';
import { useSettingsStore } from '@/features/settings/settingsStore';
import { useFocusedAsyncData } from '@/hooks/useAsyncData';
import { colors, font, radius, spacing } from '@/theme';

export default function HomeScreen() {
  const repos = useRepositories();
  const resetSession = useScanSessionStore((s) => s.reset);
  const mode = useSettingsStore((s) => s.recognitionMode);

  const stats = useFocusedAsyncData(
    useCallback(async () => {
      const [scans, collection] = await Promise.all([repos.scans.count(), repos.collection.count()]);
      return { scans, collection };
    }, [repos]),
  );

  const startScan = () => {
    resetSession();
    router.push('/scan');
  };

  const statValue = (n: number | undefined) => (stats.status === 'success' ? String(n) : stats.status === 'error' ? '!' : '…');

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={font.title}>CardVariant</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Settings"
            hitSlop={12}
            onPress={() => router.push('/settings')}>
            <Ionicons name="settings-outline" size={26} color={colors.textMuted} />
          </Pressable>
        </View>
        <Text style={styles.subtitle}>Scanner · identify the exact parallel</Text>
      </View>

      <View style={styles.stats}>
        <Stat label="Cards scanned" value={statValue(stats.data?.scans)} />
        <Stat label="In collection" value={statValue(stats.data?.collection)} />
      </View>

      {mode === 'mock' ? (
        <Text style={styles.modeNote}>Recognition: mock mode (simulated results)</Text>
      ) : null}

      <View style={styles.actions}>
        <AppButton label="Scan Card" icon="scan" size="lg" onPress={startScan} />
        <AppButton
          label="My Collection"
          icon="albums-outline"
          variant="secondary"
          size="lg"
          onPress={() => router.push('/collection')}
        />
        <AppButton
          label="Scan History"
          icon="time-outline"
          variant="secondary"
          size="lg"
          onPress={() => router.push('/history')}
        />
      </View>
    </SafeAreaView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat} accessible accessibilityLabel={`${label}: ${value}`}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={font.caption}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background, padding: spacing.lg, gap: spacing.xl },
  header: { gap: spacing.xs, marginTop: spacing.lg },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  subtitle: { ...font.body, color: colors.textMuted },
  stats: { flexDirection: 'row', gap: spacing.md },
  stat: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: 2,
  },
  statValue: { fontSize: 28, fontWeight: '800', color: colors.accent },
  modeNote: { ...font.caption, color: colors.warning, textAlign: 'center' },
  actions: { marginTop: 'auto', gap: spacing.md, paddingBottom: spacing.lg },
});
