import { useCameraPermissions } from 'expo-camera';
import type { ReactNode } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppButton } from '@/components/AppButton';
import { LoadingState } from '@/components/StateViews';
import { colors, font, spacing } from '@/theme';

/** Renders children only once camera permission is granted; otherwise explains and asks. */
export function CameraPermissionGate({ children }: { children: ReactNode }) {
  const [permission, requestPermission] = useCameraPermissions();

  if (!permission) return <LoadingState message="Checking camera permission…" />;
  if (permission.granted) return <>{children}</>;

  const blocked = !permission.canAskAgain;
  return (
    <View style={styles.container}>
      <Ionicons name="camera-outline" size={56} color={colors.textMuted} />
      <Text style={font.heading}>Camera access needed</Text>
      <Text style={styles.body}>
        {blocked
          ? 'Camera permission was denied. Enable it in your phone settings to scan cards.'
          : 'CardVariant Scanner photographs the front and back of your card to identify it. Photos stay on your device.'}
      </Text>
      {blocked ? (
        <AppButton label="Open Settings" icon="settings-outline" onPress={() => void Linking.openSettings()} size="lg" />
      ) : (
        <AppButton label="Allow Camera" icon="camera" onPress={() => void requestPermission()} size="lg" />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  body: { ...font.body, color: colors.textMuted, textAlign: 'center' },
});
