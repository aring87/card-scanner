import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '@/theme';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

type Props = {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: 'md' | 'lg';
  icon?: ComponentProps<typeof Ionicons>['name'];
  loading?: boolean;
  disabled?: boolean;
  accessibilityHint?: string;
};

const VARIANT_STYLES: Record<Variant, { bg: string; pressed: string; fg: string; border: string }> = {
  primary: { bg: colors.primary, pressed: colors.primaryPressed, fg: colors.onPrimary, border: colors.primary },
  secondary: { bg: colors.surfaceRaised, pressed: colors.border, fg: colors.text, border: colors.border },
  ghost: { bg: 'transparent', pressed: colors.surface, fg: colors.info, border: 'transparent' },
  danger: { bg: 'transparent', pressed: colors.surface, fg: colors.danger, border: colors.danger },
};

export function AppButton({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  loading = false,
  disabled = false,
  accessibilityHint,
}: Props) {
  const v = VARIANT_STYLES[variant];
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        size === 'lg' ? styles.large : styles.medium,
        { backgroundColor: pressed ? v.pressed : v.bg, borderColor: v.border },
        inactive && styles.inactive,
      ]}>
      <View style={styles.row}>
        {loading ? (
          <ActivityIndicator color={v.fg} />
        ) : icon ? (
          <Ionicons name={icon} size={size === 'lg' ? 24 : 20} color={v.fg} />
        ) : null}
        <Text style={[styles.label, size === 'lg' && styles.labelLarge, { color: v.fg }]}>{label}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  medium: { minHeight: 48, paddingHorizontal: spacing.lg },
  large: { minHeight: 60, paddingHorizontal: spacing.xl },
  inactive: { opacity: 0.5 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  label: { fontSize: 16, fontWeight: '700' },
  labelLarge: { fontSize: 18 },
});
