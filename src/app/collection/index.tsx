import { router } from 'expo-router';
import { useCallback } from 'react';
import { FlatList, StyleSheet } from 'react-native';

import { EmptyState, ErrorState, LoadingState } from '@/components/StateViews';
import { useRepositories } from '@/db/DatabaseProvider';
import { ScanListRow } from '@/features/collection/components/ScanListRow';
import { useScanSessionStore } from '@/features/scanner';
import { useFocusedAsyncData } from '@/hooks/useAsyncData';
import { colors, spacing } from '@/theme';

export default function CollectionScreen() {
  const repos = useRepositories();
  const resetSession = useScanSessionStore((s) => s.reset);
  const data = useFocusedAsyncData(useCallback(() => repos.collection.list(), [repos]));

  if (data.status === 'loading') return <LoadingState message="Loading collection…" />;
  if (data.status === 'error') return <ErrorState error={data.error} onRetry={data.reload} />;

  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={data.data.length === 0 ? styles.emptyContainer : styles.content}
      data={data.data}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <ScanListRow scan={item.scan} onPress={() => router.push({ pathname: '/collection/[id]', params: { id: item.id } })} />
      )}
      ListEmptyComponent={
        <EmptyState
          icon="albums-outline"
          title="No cards yet"
          message="Scan a card and confirm the result to add it to your collection. Everything is stored on this device."
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
