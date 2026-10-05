import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing } from '@/theme';
import { orDash } from '@/utils/format';

type Props = { label: string; value: string | number | null | undefined; emphasize?: boolean };

export function InfoRow({ label, value, emphasize = false }: Props) {
  return (
    <View style={styles.row} accessible accessibilityLabel={`${label}: ${orDash(value)}`}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, emphasize && styles.emphasize]} numberOfLines={2}>
        {orDash(value)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md, paddingVertical: 2 },
  label: { fontSize: 15, color: colors.textMuted, flexShrink: 0 },
  value: { fontSize: 15, color: colors.text, fontWeight: '600', textAlign: 'right', flexShrink: 1 },
  emphasize: { color: colors.accent, fontSize: 16 },
});
