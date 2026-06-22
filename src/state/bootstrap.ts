import { useEffect, useState } from 'react';

import { getDb } from '@/db/client';
import { useSettings } from './settings';

interface BootstrapState {
  ready: boolean;
  error: string | null;
}

/** Opens + migrates the encrypted DB and loads settings once on startup. */
export function useBootstrap(): BootstrapState {
  const [state, setState] = useState<BootstrapState>({ ready: false, error: null });
  const loadSettings = useSettings((s) => s.load);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        await getDb();
        await loadSettings();
        if (active) setState({ ready: true, error: null });
      } catch (e) {
        if (active) setState({ ready: false, error: e instanceof Error ? e.message : String(e) });
      }
    })();
    return () => {
      active = false;
    };
  }, [loadSettings]);

  return state;
}
