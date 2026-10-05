import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '@/theme';

type Tone = 'info' | 'warning' | 'danger';

const TONES: Record<Tone, { color: string; icon: 'information-circle' | 'warning' | 'alert-circle' }> = {
  info: { color: colors.info, icon: 'information-circle' },
  warning: { color: colors.warning, icon: 'warning' },
  danger: { color: colors.danger, icon: 'alert-circle' },
};

export function Banner({ tone = 'info', title, message }: { tone?: Tone; title: string; message?: string }) {
  const t = TONES[tone];
  return (
    <View style={[styles.banner, { borderColor: t.color }]} accessibilityRole="alert">
      <Ionicons name={t.icon} size={22} color={t.color} />
      <View style={styles.text}>
        <Text style={[styles.title, { color: t.color }]}>{title}</Text>
        {message ? <Text style={styles.message}>{message}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    backgroundColor: colors.surface,
    alignItems: 'flex-start',
  },
  text: { flex: 1, gap: 2 },
  title: { fontSize: 15, fontWeight: '700' },
  message: { fontSize: 14, color: colors.textMuted },
});
