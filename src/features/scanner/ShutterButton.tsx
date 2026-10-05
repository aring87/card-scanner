import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { colors } from '@/theme';

type Props = { onPress: () => void; disabled?: boolean; busy?: boolean };

export function ShutterButton({ onPress, disabled = false, busy = false }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Capture photo"
      accessibilityState={{ disabled: disabled || busy, busy }}
      disabled={disabled || busy}
      onPress={onPress}
      hitSlop={12}
      style={({ pressed }) => [styles.outer, (disabled || busy) && styles.disabled, pressed && styles.pressed]}>
      <View style={styles.inner}>{busy ? <ActivityIndicator color={colors.background} /> : null}</View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  outer: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 5,
    borderColor: colors.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { transform: [{ scale: 0.94 }] },
  disabled: { opacity: 0.4 },
});
