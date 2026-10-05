import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { colors, font, radius, spacing } from '@/theme';

type Props = { title?: string; right?: ReactNode; children: ReactNode; style?: ViewStyle };

/** A rounded surface section with an optional title. */
export function Panel({ title, right, children, style }: Props) {
  return (
    <View style={[styles.panel, style]}>
      {title ? (
        <View style={styles.header}>
          <Text style={font.label}>{title.toUpperCase()}</Text>
          {right}
        </View>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
