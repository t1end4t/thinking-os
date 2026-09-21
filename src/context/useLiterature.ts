import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { loadLiterature, mergeDiscoveryPapers, mutateLiterature } from '../literatureClient';
import type { DiscoveryPaper, LiteratureCommand, LiteratureJobInput, LiteratureSearch, LiteratureSnapshot } from '../literatureTypes';

interface LiteratureState {
  readonly snapshot: LiteratureSnapshot | null;
  readonly searchResults: DiscoveryPaper[];
  readonly searchQueries: string[];
  readonly searched: boolean;
  readonly loading: boolean;
  readonly busy: LiteratureCommand['action'] | null;
  readonly error: string | null;
}

interface LiteratureStore {
  state: LiteratureState;
  readonly listeners: Set<() => void>;
  readonly controllers: Set<AbortController>;
  revision: number;
}

const stores = new Map<string, LiteratureStore>();

function storeFor(dir: string): LiteratureStore {
  let store = stores.get(dir);
  if (!store) {
    store = { state: { snapshot: null, searchResults: [], searchQueries: [], searched: false, loading: true, busy: null, error: null },
      listeners: new Set(), controllers: new Set(), revision: 0 };
    stores.set(dir, store);
  }
  return store;
}

function publish(store: LiteratureStore, changes: Partial<LiteratureState>) {
  store.state = { ...store.state, ...changes };
  store.listeners.forEach(listener => listener());
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : 'The literature request could not complete.';
}

export function useLiterature(dir: string) {
  const store = storeFor(dir);
  const subscribe = useCallback((listener: () => void) => {
    store.listeners.add(listener);
    return () => { store.listeners.delete(listener); };
  }, [store]);
  const state = useSyncExternalStore(subscribe, () => store.state);

  const refresh = useCallback(async () => {
    const controller = new AbortController();
    const revision = ++store.revision;
    store.controllers.add(controller);
    try {
      const snapshot = await loadLiterature(dir, controller.signal);
      if (!controller.signal.aborted && store.revision === revision) publish(store, { snapshot, loading: false, error: null });
    } catch (error) {
      if (!controller.signal.aborted && store.revision === revision) publish(store, { error: message(error), loading: false });
    } finally {
      store.controllers.delete(controller);
    }
  }, [dir, store]);

  useEffect(() => {
    let disposed = false;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      if (!store.state.busy) await refresh();
      if (!disposed) timer = setTimeout(() => void poll(), store.state.snapshot?.runs.some(run => run.status === 'running') ? 2000 : 30000);
    };
    void poll();
    const onFocus = () => { if (!store.state.busy) void refresh(); };
    window.addEventListener('focus', onFocus);
    return () => {
      disposed = true;
      clearTimeout(timer);
      window.removeEventListener('focus', onFocus);
      if (store.listeners.size === 0) {
        store.controllers.forEach(controller => controller.abort());
        store.controllers.clear();
        publish(store, { busy: null, loading: false });
      }
    };
  }, [refresh, store]);

  const mutate = useCallback(async (command: LiteratureCommand): Promise<boolean> => {
    if (store.state.busy) return false;
    const controller = new AbortController();
    store.controllers.add(controller);
    store.revision++;
    publish(store, { busy: command.action, error: null });
    try {
      const result = await mutateLiterature(dir, command, controller.signal);
      if (controller.signal.aborted) return false;
      if ('results' in result && result.results) {
        publish(store, { searchResults: result.results, searchQueries: result.queries, searched: true });
      } else {
        if ('run' in result && result.run && store.state.snapshot) {
          const snapshot = store.state.snapshot;
          publish(store, { snapshot: { ...snapshot, runs: [result.run, ...snapshot.runs.filter(run => run.id !== result.run.id)] } });
        }
        await refresh();
      }
      return true;
    } catch (error) {
      if (!controller.signal.aborted) publish(store, { error: message(error) });
      return false;
    } finally {
      store.controllers.delete(controller);
      if (!controller.signal.aborted) publish(store, { busy: null });
    }
  }, [dir, refresh, store]);

  return {
    ...state,
    results: mergeDiscoveryPapers([...state.searchResults, ...(state.snapshot?.results ?? [])]),
    refresh,
    search: (input: LiteratureSearch) => mutate({ action: 'search', ...input }),
    createJob: (input: LiteratureJobInput) => mutate({ action: 'create', ...input }),
    updateJob: (id: string, input: LiteratureJobInput) => mutate({ action: 'update', id, ...input }),
    deleteJob: (id: string) => mutate({ action: 'delete', id }),
    runJob: (id: string) => mutate({ action: 'run', id }),
  };
}
