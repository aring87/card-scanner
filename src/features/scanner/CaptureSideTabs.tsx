import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '@/theme';

import type { CaptureSide } from './scanSessionStore';

type Props = {
  active: CaptureSide;
  captured: Record<CaptureSide, boolean>;
  onChange: (side: CaptureSide) => void;
};

const SIDES: CaptureSide[] = ['front', 'back'];

export function CaptureSideTabs({ active, captured, onChange }: Props) {
  return (
    <View style={styles.row} accessibilityRole="tablist">
      {SIDES.map((side) => {
        const selected = side === active;
        return (
          <Pressable
            key={side}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={`${side} side${captured[side] ? ', captured' : ''}`}
            onPress={() => onChange(side)}
            style={[styles.tab, selected && styles.selected]}>
            {captured[side] ? <Ionicons name="checkmark-circle" size={18} color={colors.success} /> : null}
            <Text style={[styles.text, selected && styles.selectedText]}>{side.toUpperCase()}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    padding: 4,
    alignSelf: 'center',
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: 120,
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
  },
  selected: { backgroundColor: colors.primary },
  text: { color: colors.textMuted, fontWeight: '800', letterSpacing: 1, fontSize: 15 },
  selectedText: { color: colors.onPrimary },
});
