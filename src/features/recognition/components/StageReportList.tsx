import { StyleSheet, Text, View } from 'react-native';

import { Panel } from '@/components/Panel';
import { colors, spacing } from '@/theme';

import type { StageReport, StageStatus } from '../pipeline/types';

const STATUS_COLORS: Record<StageStatus, string> = {
  completed: colors.success,
  not_implemented: colors.textSubtle,
  skipped: colors.textSubtle,
  failed: colors.danger,
};

/** Developer diagnostics: which stage ran, with which implementation. */
export function StageReportList({ stages }: { stages: StageReport[] }) {
  return (
    <Panel title="Pipeline stages">
      {stages.map((s) => (
        <View key={s.stage} style={styles.row}>
          <View style={[styles.dot, { backgroundColor: STATUS_COLORS[s.status] }]} />
          <View style={styles.text}>
            <Text style={styles.stage}>{s.stage}</Text>
            <Text style={styles.meta}>
              {s.implementation} · {s.status.replace('_', ' ')}
              {s.message && s.status === 'failed' ? ` · ${s.message}` : ''}
            </Text>
          </View>
        </View>
      ))}
    </Panel>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dot: { width: 10, height: 10, borderRadius: 5 },
  text: { flex: 1 },
  stage: { color: colors.text, fontSize: 14, fontWeight: '600' },
  meta: { color: colors.textMuted, fontSize: 12 },
});
