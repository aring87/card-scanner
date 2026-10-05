import { StyleSheet, View } from 'react-native';

import { colors, radius } from '@/theme';

export function confidenceColor(confidence: number): string {
  if (confidence >= 0.75) return colors.success;
  if (confidence >= 0.4) return colors.warning;
  return colors.danger;
}

export function ConfidenceBar({ confidence, height = 8 }: { confidence: number; height?: number }) {
  const clamped = Math.max(0, Math.min(1, confidence));
  return (
    <View style={[styles.track, { height }]} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}>
      <View style={[styles.fill, { width: `${clamped * 100}%`, backgroundColor: confidenceColor(clamped) }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { width: '100%', backgroundColor: colors.surfaceRaised, borderRadius: radius.pill, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.pill },
});
