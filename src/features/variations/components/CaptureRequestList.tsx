import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import type { CaptureRequest } from '@/models';
import { colors, spacing } from '@/theme';

export function CaptureRequestList({ requests }: { requests: CaptureRequest[] }) {
  return (
    <View style={styles.list}>
      {requests.map((r) => (
        <View key={`${r.side}:${r.region}`} style={styles.item}>
          <Ionicons
            name={r.side === 'tilt' ? 'sunny-outline' : 'camera-outline'}
            size={22}
            color={colors.accent}
          />
          <View style={styles.text}>
            <Text style={styles.instruction}>{r.instruction}</Text>
            <Text style={styles.reason}>{r.reason}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.md },
  item: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  text: { flex: 1, gap: 2 },
  instruction: { color: colors.text, fontSize: 16, fontWeight: '700' },
  reason: { color: colors.textMuted, fontSize: 14 },
});
