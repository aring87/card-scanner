import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing } from '@/theme';

type Kind = 'evidence' | 'missing' | 'conflict';

const KINDS: Record<Kind, { icon: 'checkmark-circle' | 'help-circle' | 'close-circle'; color: string; a11y: string }> = {
  evidence: { icon: 'checkmark-circle', color: colors.success, a11y: 'Supports' },
  missing: { icon: 'help-circle', color: colors.textSubtle, a11y: 'Not yet checked' },
  conflict: { icon: 'close-circle', color: colors.danger, a11y: 'Conflicts' },
};

export function EvidenceList({ items, kind }: { items: string[]; kind: Kind }) {
  if (items.length === 0) return null;
  const k = KINDS[kind];
  return (
    <View style={styles.list}>
      {items.map((item) => (
        <View key={item} style={styles.item} accessible accessibilityLabel={`${k.a11y}: ${item}`}>
          <Ionicons name={k.icon} size={18} color={k.color} style={styles.icon} />
          <Text style={styles.text}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.sm },
  item: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  icon: { marginTop: 1 },
  text: { flex: 1, color: colors.text, fontSize: 15, lineHeight: 20 },
});
