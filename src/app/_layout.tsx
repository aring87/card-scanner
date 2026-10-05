import { DarkTheme, Stack, ThemeProvider, type ErrorBoundaryProps } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ErrorState } from '@/components/StateViews';
import { DatabaseProvider } from '@/db/DatabaseProvider';
import { colors } from '@/theme';

const navigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: colors.primary,
    background: colors.background,
    card: colors.background,
    text: colors.text,
    border: colors.border,
  },
};

/** Catches render errors in any route and offers a retry instead of a blank screen. */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return <ErrorState error={error} onRetry={retry} />;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
      <SafeAreaProvider>
        <ThemeProvider value={navigationTheme}>
          <StatusBar style="light" />
          <DatabaseProvider>
            <Stack
              screenOptions={{
                headerStyle: { backgroundColor: colors.background },
                headerTintColor: colors.text,
                headerTitleStyle: { fontWeight: '700' },
                contentStyle: { backgroundColor: colors.background },
              }}>
              <Stack.Screen name="index" options={{ title: 'CardVariant Scanner', headerShown: false }} />
              <Stack.Screen name="scan/index" options={{ title: 'Scan Card' }} />
              <Stack.Screen name="scan/review" options={{ title: 'Scan Review' }} />
              <Stack.Screen name="scan/variations" options={{ title: 'Variation Results' }} />
              <Stack.Screen name="scan/correct" options={{ title: 'Correct Identification', presentation: 'modal' }} />
              <Stack.Screen name="collection/index" options={{ title: 'My Collection' }} />
              <Stack.Screen name="collection/[id]" options={{ title: 'Card Detail' }} />
              <Stack.Screen name="history" options={{ title: 'Scan History' }} />
              <Stack.Screen name="settings" options={{ title: 'Settings' }} />
            </Stack>
          </DatabaseProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
