import { useCallback } from 'react';

import { useRepositories } from '@/db/DatabaseProvider';

import { useFocusedAsyncData } from './useAsyncData';

/** Loads a scan and whether it is already in the collection. Refreshes on focus. */
export function useScan(scanId: string | undefined) {
  const repos = useRepositories();
  return useFocusedAsyncData(
    useCallback(async () => {
      if (!scanId) throw new Error('No scan selected.');
      const scan = await repos.scans.getById(scanId);
      if (!scan) throw new Error('This scan no longer exists.');
      const collectionItem = await repos.collection.getByScanId(scanId);
      return { scan, collectionItem };
    }, [repos, scanId]),
  );
}
