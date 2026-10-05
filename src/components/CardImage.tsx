import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { resolveImageUri } from '@/services/imageStorage';
import { CARD_ASPECT_RATIO, colors, radius } from '@/theme';

type Props = { uri: string | null | undefined; width: number; label?: string };

/** Shows a stored card photo at trading-card proportions, with a placeholder when missing. */
export function CardImage({ uri, width, label }: Props) {
  const resolved = resolveImageUri(uri);
  const size = { width, height: width / CARD_ASPECT_RATIO };
  return (
    <View style={[styles.frame, size]} accessibilityLabel={label ? `${label} image` : 'Card image'}>
      {resolved ? (
        <Image source={{ uri: resolved }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
      ) : (
        <View style={styles.placeholder}>
          <Ionicons name="image-outline" size={Math.min(32, width / 3)} color={colors.textSubtle} />
          {label && width > 80 ? <Text style={styles.placeholderText}>No {label.toLowerCase()}</Text> : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    borderRadius: radius.sm,
    overflow: 'hidden',
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
  },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4 },
  placeholderText: { color: colors.textSubtle, fontSize: 12 },
});
