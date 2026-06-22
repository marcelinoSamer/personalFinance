import { useCallback, useEffect, useState } from 'react';
import { create } from 'zustand';

interface DataVersionState {
  version: number;
  bump: () => void;
}

/** A global counter bumped after any DB mutation so screens re-query. */
export const useDataVersion = create<DataVersionState>((set) => ({
  version: 0,
  bump: () => set((s) => ({ version: s.version + 1 })),
}));

/** Call after any insert/update/delete to refresh all subscribed screens. */
export function bumpData(): void {
  useDataVersion.getState().bump();
}

export interface AsyncData<T> {
  data: T | undefined;
  loading: boolean;
  reload: () => void;
}

/**
 * Runs an async query, re-running when `deps` change or after any data mutation.
 */
export function useAsyncData<T>(fn: () => Promise<T>, deps: unknown[] = []): AsyncData<T> {
  const version = useDataVersion((s) => s.version);
  const [data, setData] = useState<T | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [manual, setManual] = useState(0);

  const reload = useCallback(() => setManual((n) => n + 1), []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fn()
      .then((d) => {
        if (active) {
          setData(d);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (active) setLoading(false);
        console.warn('useAsyncData query failed', e);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, manual, ...deps]);

  return { data, loading, reload };
}
