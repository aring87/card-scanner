import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

import { ErrorState, LoadingState } from '@/components/StateViews';
import { createRepositories, type Repositories } from '@/repositories';

import { openAppDatabase } from './client';

type State = { status: 'loading' } | { status: 'ready'; repos: Repositories } | { status: 'error'; error: unknown };

const RepositoriesContext = createContext<Repositories | null>(null);

/** Opens + migrates + seeds the local database before rendering the app. */
export function DatabaseProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    openAppDatabase()
      .then((db) => !cancelled && setState({ status: 'ready', repos: createRepositories(db) }))
      .catch((error: unknown) => !cancelled && setState({ status: 'error', error }));
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const retry = useCallback(() => {
    setState({ status: 'loading' });
    setAttempt((n) => n + 1);
  }, []);

  if (state.status === 'loading') return <LoadingState message="Opening your collection…" />;
  if (state.status === 'error') {
    return <ErrorState title="Could not open the card database" error={state.error} onRetry={retry} />;
  }
  return <RepositoriesContext.Provider value={state.repos}>{children}</RepositoriesContext.Provider>;
}

export function useRepositories(): Repositories {
  const repos = useContext(RepositoriesContext);
  if (!repos) throw new Error('useRepositories must be used inside <DatabaseProvider>');
  return repos;
}
