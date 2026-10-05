import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';

export type AsyncData<T> =
  | { status: 'loading'; data?: undefined; error?: undefined }
  | { status: 'success'; data: T; error?: undefined }
  | { status: 'error'; data?: undefined; error: unknown };

/**
 * Loads data whenever the screen gains focus (so lists refresh after navigating back) and exposes
 * an explicit `reload`. `load` must be memoized (useCallback) or it will reload on every render.
 */
export function useFocusedAsyncData<T>(load: () => Promise<T>) {
  const [state, setState] = useState<AsyncData<T>>({ status: 'loading' });
  const requestId = useRef(0);

  const reload = useCallback(() => {
    const id = ++requestId.current;
    load()
      .then((data) => id === requestId.current && setState({ status: 'success', data }))
      .catch((error: unknown) => id === requestId.current && setState({ status: 'error', error }));
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  return { ...state, reload };
}
