import { useState } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';

import { CARD_ASPECT_RATIO, colors, spacing } from '@/theme';

const CORNER = 28;
const STROKE = 4;

type Props = { label: string; hint?: string | null };

/**
 * Card-shaped (2.5 × 3.5) alignment guide drawn ABOVE the camera preview. It is a sibling view,
 * not part of the camera feed, so it never appears in captured photos.
 */
export function CardAlignmentOverlay({ label, hint }: Props) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const onLayout = (e: LayoutChangeEvent) => setSize(e.nativeEvent.layout);

  const guideWidth = Math.min(size.width * 0.82, size.height * 0.72 * CARD_ASPECT_RATIO);
  const guideHeight = guideWidth / CARD_ASPECT_RATIO;
  const left = (size.width - guideWidth) / 2;
  const top = (size.height - guideHeight) / 2;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" onLayout={onLayout}>
      {size.width > 0 ? (
        <>
          <View style={[styles.dim, { top: 0, left: 0, right: 0, height: top }]} />
          <View style={[styles.dim, { top: top + guideHeight, left: 0, right: 0, bottom: 0 }]} />
          <View style={[styles.dim, { top, left: 0, width: left, height: guideHeight }]} />
          <View style={[styles.dim, { top, right: 0, width: left, height: guideHeight }]} />

          <View style={[styles.guide, { top, left, width: guideWidth, height: guideHeight }]}>
            <View style={[styles.corner, styles.tl]} />
            <View style={[styles.corner, styles.tr]} />
            <View style={[styles.corner, styles.bl]} />
            <View style={[styles.corner, styles.br]} />
          </View>

          <View style={[styles.caption, { top: Math.max(spacing.sm, top - 40) }]}>
            <Text style={styles.label}>{label}</Text>
          </View>
          {hint ? (
            <View style={[styles.caption, { top: top + guideHeight + spacing.sm }]}>
              <Text style={styles.hint}>{hint}</Text>
            </View>
          ) : null}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  dim: { position: 'absolute', backgroundColor: colors.overlay },
  guide: { position: 'absolute', borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)', borderRadius: 12 },
  corner: { position: 'absolute', width: CORNER, height: CORNER, borderColor: colors.accent },
  tl: { top: -2, left: -2, borderTopWidth: STROKE, borderLeftWidth: STROKE, borderTopLeftRadius: 12 },
  tr: { top: -2, right: -2, borderTopWidth: STROKE, borderRightWidth: STROKE, borderTopRightRadius: 12 },
  bl: { bottom: -2, left: -2, borderBottomWidth: STROKE, borderLeftWidth: STROKE, borderBottomLeftRadius: 12 },
  br: { bottom: -2, right: -2, borderBottomWidth: STROKE, borderRightWidth: STROKE, borderBottomRightRadius: 12 },
  caption: { position: 'absolute', left: spacing.lg, right: spacing.lg, alignItems: 'center' },
  label: { color: colors.text, fontSize: 16, fontWeight: '700', letterSpacing: 1 },
  hint: {
    color: colors.accent,
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 8,
    overflow: 'hidden',
  },
});
