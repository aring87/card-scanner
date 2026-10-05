import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { colors, font, spacing } from '@/theme';

import { AppButton } from './AppButton';

export function LoadingState({ message = 'Loading…' }: { message?: string }) {
  return (
    <View style={styles.center} accessibilityLiveRegion="polite">
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

export function ErrorState({
  title = 'Something went wrong',
  error,
  onRetry,
}: {
  title?: string;
  error: unknown;
  onRetry?: () => void;
}) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    <View style={styles.center}>
      <Ionicons name="alert-circle" size={48} color={colors.danger} />
      <Text style={font.heading}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {onRetry ? <AppButton label="Try again" onPress={onRetry} variant="secondary" icon="refresh" /> : null}
    </View>
  );
}

export function EmptyState({
  icon,
  title,
  message,
  actionLabel,
  onAction,
}: {
  icon: ComponentProps<typeof Ionicons>['name'];
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.center}>
      <Ionicons name={icon} size={48} color={colors.textSubtle} />
      <Text style={font.heading}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {actionLabel && onAction ? <AppButton label={actionLabel} onPress={onAction} icon="scan" /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xl },
  message: { ...font.body, color: colors.textMuted, textAlign: 'center' },
});
