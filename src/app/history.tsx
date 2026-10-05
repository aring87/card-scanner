import { router } from 'expo-router';
import { useCallback } from 'react';
import { FlatList, StyleSheet } from 'react-native';

import { EmptyState, ErrorState, LoadingState } from '@/components/StateViews';
import { useRepositories } from '@/db/DatabaseProvider';
import { ScanListRow } from '@/features/collection/components/ScanListRow';
import { useScanSessionStore } from '@/features/scanner';
import { useFocusedAsyncData } from '@/hooks/useAsyncData';
import { colors, spacing } from '@/theme';

export default function ScanHistoryScreen() {
  const repos = useRepositories();
  const resetSession = useScanSessionStore((s) => s.reset);
  const data = useFocusedAsyncData(useCallback(() => repos.scans.list({ limit: 200 }), [repos]));

  if (data.status === 'loading') return <LoadingState message="Loading scan history…" />;
  if (data.status === 'error') return <ErrorState error={data.error} onRetry={data.reload} />;

  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={data.data.length === 0 ? styles.emptyContainer : styles.content}
      data={data.data}
      keyExtractor={(scan) => scan.id}
      renderItem={({ item }) => (
        <ScanListRow scan={item} showStatus onPress={() => router.push({ pathname: '/scan/review', params: { scanId: item.id } })} />
      )}
      ListEmptyComponent={
        <EmptyState
          icon="time-outline"
          title="No scans yet"
          message="Every scan attempt is saved here, whether or not you add it to your collection."
          actionLabel="Scan Card"
          onAction={() => {
            resetSession();
            router.push('/scan');
          }}
        />
      }
    />
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md },
  emptyContainer: { flexGrow: 1 },
});
