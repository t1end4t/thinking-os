import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { activeScoutRun, cancelScoutRunRequest, deleteScoutRunRequest, deleteTopicWatchRequest, loadScouts, mutateScout, saveScoutBriefRequest, saveTopicWatchRequest, startScoutRunRequest, type ScoutControlAction, type ScoutMutation } from '../scoutClient';
import type { ScoutBriefInput, ScoutSnapshot, TopicWatchInput } from '../scoutTypes';

type ScoutState = {
  readonly snapshot: ScoutSnapshot | null;
  readonly loading: boolean;
  readonly busy: ScoutControlAction | null;
  readonly error: string | null;
};

type ScoutStore = {
  state: ScoutState;
  readonly listeners: Set<() => void>;
  readonly controllers: Set<AbortController>;
  revision: number;
};

const stores = new Map<string, ScoutStore>();

function storeFor(dir: string): ScoutStore {
  let store = stores.get(dir);
  if (!store) {
    store = {
      state: { snapshot: null, loading: true, busy: null, error: null },
      listeners: new Set(),
      controllers: new Set(),
      revision: 0
    };
    stores.set(dir, store);
  }
  return store;
}

function publish(store: ScoutStore, changes: Partial<ScoutState>) {
  store.state = { ...store.state, ...changes };
  store.listeners.forEach(listener => listener());
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'The scout request could not complete.';
}

export function useScouts(dir: string) {
  const store = storeFor(dir);
  const subscribe = useCallback((listener: () => void) => {
    store.listeners.add(listener);
    return () => { store.listeners.delete(listener); };
  }, [store]);
  const state = useSyncExternalStore(subscribe, () => store.state);
  const hasActiveRun = state.snapshot?.runs.some(run => activeScoutRun(run.state)) ?? false;

  const refresh = useCallback(async () => {
    const controller = new AbortController();
    const revision = ++store.revision;
    store.controllers.add(controller);
    try {
      const snapshot = await loadScouts(dir, controller.signal);
      if (!controller.signal.aborted && store.revision === revision) publish(store, { snapshot, loading: false, error: null });
    } catch (error) {
      if (!controller.signal.aborted && store.revision === revision) publish(store, { loading: false, error: errorMessage(error) });
    } finally {
      store.controllers.delete(controller);
    }
  }, [dir, store]);

  useEffect(() => {
    let disposed = false;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      if (!store.state.busy) await refresh();
      if (!disposed) timer = setTimeout(() => void poll(), 30000);
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

  useEffect(() => {
    if (!hasActiveRun) return;
    const timer = window.setInterval(() => { if (!store.state.busy) void refresh(); }, 2000);
    return () => window.clearInterval(timer);
  }, [hasActiveRun, refresh, store]);

  const mutate = useCallback(async (mutation: ScoutMutation): Promise<boolean> => {
    if (store.state.busy) return false;
    const controller = new AbortController();
    store.controllers.add(controller);
    store.revision++;
    publish(store, { busy: mutation.action, error: null });
    try {
      const report = await mutateScout(dir, mutation, controller.signal);
      if (controller.signal.aborted) return false;
      const snapshot = store.state.snapshot;
      if (snapshot) publish(store, { snapshot: { ...snapshot, reports: snapshot.reports.map(item => item.id === report.id ? report : item) } });
      return true;
    } catch (error) {
      if (!controller.signal.aborted) publish(store, { error: errorMessage(error) });
      return false;
    } finally {
      store.controllers.delete(controller);
      publish(store, { busy: null });
    }
  }, [dir, store]);

  const control = useCallback(async <T>(action: ScoutControlAction, operation: (signal: AbortSignal) => Promise<T>): Promise<T | false> => {
    if (store.state.busy) return false;
    const controller = new AbortController();
    store.controllers.add(controller);
    store.revision++;
    publish(store, { busy: action, error: null });
    try {
      const result = await operation(controller.signal);
      if (controller.signal.aborted) return false;
      const snapshot = await loadScouts(dir, controller.signal);
      if (!controller.signal.aborted) publish(store, { snapshot, loading: false, error: null });
      return result;
    } catch (error) {
      if (!controller.signal.aborted) publish(store, { error: errorMessage(error) });
      return false;
    } finally {
      store.controllers.delete(controller);
      publish(store, { busy: null });
    }
  }, [dir, store]);

  return {
    ...state,
    refresh,
    saveBrief: (id: string | undefined, brief: ScoutBriefInput) => control('save-brief', signal => saveScoutBriefRequest(dir, id, brief, signal)),
    saveWatch: (id: string | undefined, watch: TopicWatchInput) => control('save-watch', signal => saveTopicWatchRequest(dir, id, watch, signal)),
    deleteWatch: (id: string) => control('delete-watch', signal => deleteTopicWatchRequest(dir, id, signal)),
    startRun: (id: string, kind: 'brief' | 'watch' = 'brief') => control('start-run', signal => startScoutRunRequest(dir, id, signal, kind)),
    cancelRun: (id: string) => control('cancel-run', signal => cancelScoutRunRequest(dir, id, signal)),
    deleteRun: (id: string) => control('delete-run', signal => deleteScoutRunRequest(dir, id, signal)),
    decideCandidate: (mutation: Omit<Extract<ScoutMutation, { action: 'decide-candidate' }>, 'action'>) => mutate({ action: 'decide-candidate', ...mutation }),
    requestInspection: (reportId: string, candidateId: string) => mutate({ action: 'request-inspection', reportId, candidateId })
  };
}
