import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CardImage } from '@/components/CardImage';
import type { CardScan } from '@/models';
import { colors, radius, spacing } from '@/theme';
import { formatDateTime, formatPercent } from '@/utils/format';

import { getScanDisplay, STATUS_LABELS } from '../scanDisplay';

type Props = { scan: CardScan; onPress: () => void; showStatus?: boolean };

/** One-handed friendly list row: thumbnail, player, year/set, card #, variation, serial. */
export function ScanListRow({ scan, onPress, showStatus = false }: Props) {
  const d = getScanDisplay(scan);
  const yearSet = [d.year, d.product].filter(Boolean).join(' · ') || 'Unknown set';
  const label = `${d.playerName ?? 'Unknown player'}, ${yearSet}, card ${d.cardNumber ?? 'unknown'}, ${d.variationName ?? 'variation unknown'}${d.serial ? `, serial ${d.serial}` : ''}`;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <CardImage uri={scan.frontImageUri ?? scan.backImageUri} width={56} label="Front" />
      <View style={styles.body}>
        <Text style={styles.player} numberOfLines={1}>
          {d.playerName ?? 'Unknown player'}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {yearSet} · #{d.cardNumber ?? '—'}
        </Text>
        <View style={styles.tags}>
          <Text style={styles.variation} numberOfLines={1}>
            {d.variationName ?? 'Variation unknown'}
          </Text>
          {d.serial ? <Text style={styles.serial}>{d.serial}</Text> : null}
        </View>
        {showStatus ? (
          <Text style={styles.meta} numberOfLines={1}>
            {formatDateTime(scan.createdAt)} · {STATUS_LABELS[d.status]} · {formatPercent(d.confidence)}
            {d.isSimulated ? ' · simulated' : ''}
          </Text>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.textSubtle} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 96,
  },
  pressed: { backgroundColor: colors.surfaceRaised },
  body: { flex: 1, gap: 2 },
  player: { color: colors.text, fontSize: 17, fontWeight: '700' },
  meta: { color: colors.textMuted, fontSize: 14 },
  tags: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  variation: { color: colors.accent, fontSize: 14, fontWeight: '700', flexShrink: 1 },
  serial: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
    backgroundColor: colors.surfaceRaised,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    overflow: 'hidden',
  },
});
