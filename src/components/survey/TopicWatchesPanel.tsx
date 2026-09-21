import { useRef, useState } from 'react';
import { CalendarClock, Pause, Pencil, Play, Plus, Trash2, X } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useScouts } from '../../context/useScouts';
import { activeScoutRun } from '../../scoutClient';
import type { TopicWatch, TopicWatchInput } from '../../scoutTypes';

const RECENCY_POLICIES = ['recent', 'mixed', 'foundational-gap'] as const;
const QUALITY_THRESHOLDS = ['high', 'medium', 'low'] as const;

type WatchDraft = {
  readonly name: string;
  readonly topic: string;
  readonly purpose: string;
  readonly scope: string;
  readonly exclusions: string;
  readonly directions: string;
  readonly qualityPolicy: string;
  readonly cadence: 'daily' | 'manual';
  readonly localTime: string;
  readonly timeZone: string;
  readonly recencyPolicy: TopicWatchInput['recencyPolicy'];
  readonly qualityThreshold: TopicWatchInput['qualityThreshold'];
  readonly maxRecommendations: number;
};

const lines = (value: string) => value.split('\n').map(line => line.trim()).filter(Boolean);

function draftOf(watch?: TopicWatch): WatchDraft {
  return {
    name: watch?.name ?? '', topic: watch?.topic ?? '', purpose: watch?.purpose ?? '', scope: watch?.scope.join('\n') ?? '',
    exclusions: watch?.exclusions.join('\n') ?? '', directions: watch?.searchDirections.map(direction => `${direction.query} :: ${direction.reason}`).join('\n') ?? '',
    qualityPolicy: watch?.qualityPolicy.join('\n') ?? 'Direct or strongly supporting relevance\nAt least medium quality confidence',
    cadence: watch?.schedule.cadence ?? 'daily', localTime: watch?.schedule.localTime ?? '08:00',
    timeZone: watch?.schedule.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
    recencyPolicy: watch?.recencyPolicy ?? 'mixed', qualityThreshold: watch?.qualityThreshold ?? 'medium',
    maxRecommendations: watch?.maxRecommendations ?? 3
  };
}

function inputOf(draft: WatchDraft, watch?: TopicWatch): TopicWatchInput | null {
  const searchDirections = lines(draft.directions).map(line => {
    const separator = line.indexOf('::');
    return separator < 0 ? null : { query: line.slice(0, separator).trim(), reason: line.slice(separator + 2).trim() };
  });
  if (!draft.name.trim() || !draft.topic.trim() || !draft.purpose.trim() || !searchDirections.length || searchDirections.some(direction => !direction?.query || !direction.reason)) return null;
  return {
    name: draft.name.trim(), topic: draft.topic.trim(), purpose: draft.purpose.trim(), scope: lines(draft.scope), exclusions: lines(draft.exclusions),
    searchDirections: searchDirections.filter((direction): direction is NonNullable<typeof direction> => Boolean(direction)), qualityPolicy: lines(draft.qualityPolicy),
    recencyPolicy: draft.recencyPolicy, qualityThreshold: draft.qualityThreshold,
    schedule: { cadence: draft.cadence, localTime: draft.localTime, timeZone: draft.timeZone.trim() }, enabled: watch?.enabled ?? false,
    maxRecommendations: draft.maxRecommendations, providerBudget: watch?.providerBudget ?? 30, knownPaperIds: watch?.knownPaperIds ?? [],
    createdFrom: watch?.createdFrom ?? { kind: 'user', reference: 'Discovery topic watch editor' }, author: 'user'
  };
}

export function TopicWatchesPanel() {
  const { workspaceDir } = useWorkspace();
  const scouts = useScouts(workspaceDir);
  const dialog = useRef<HTMLDialogElement>(null);
  const dialogTrigger = useRef<HTMLButtonElement | null>(null);
  const [editing, setEditing] = useState<TopicWatch>();
  const [draft, setDraft] = useState<WatchDraft>(() => draftOf());
  const [validation, setValidation] = useState('');
  const watches = [...(scouts.snapshot?.watches ?? [])].sort((first, second) => first.name.localeCompare(second.name));
  const busy = scouts.busy !== null;

  const open = (trigger: HTMLButtonElement, watch?: TopicWatch) => { dialogTrigger.current = trigger; setEditing(watch); setDraft(draftOf(watch)); setValidation(''); dialog.current?.showModal(); };
  const save = async () => {
    const input = inputOf(draft, editing);
    if (!input) { setValidation('Name, topic, purpose, and every “query :: reason” line are required.'); return; }
    if (await scouts.saveWatch(editing?.id, input)) dialog.current?.close();
  };
  const toggle = (watch: TopicWatch) => scouts.saveWatch(watch.id, { ...watch, enabled: !watch.enabled, author: 'user' });

  return <section className="topic-watches" aria-labelledby="topic-watches-title">
    <header><div><span className="scout-report-kicker">Scheduled discovery</span><h2 id="topic-watches-title">Topic watches</h2><p>Scheduler active while this app process runs. Missed schedules create at most one catch-up digest.</p></div>
      <button type="button" className="survey-btn survey-btn-primary" onClick={event => open(event.currentTarget)}><Plus size={12} />New watch</button></header>
    {scouts.error && <p className="scout-report-alert" role="alert">{scouts.error}</p>}
    <div className="topic-watch-list">
      {watches.map(watch => {
        const run = [...(scouts.snapshot?.runs ?? [])].filter(item => item.source.kind === 'watch' && item.source.id === watch.id).sort((a, b) => b.startedAt - a.startedAt)[0];
        const running = Boolean(run && activeScoutRun(run.state));
        return <article key={watch.id} className="topic-watch-card">
          <div><span className="topic-watch-state">{watch.enabled ? 'active' : 'paused'} · {watch.schedule.cadence}</span><h3>{watch.name}</h3><p>{watch.purpose}</p>
            <small>{watch.recencyPolicy} · {watch.qualityThreshold}+ confidence · up to {watch.maxRecommendations} papers</small>
            <small>{watch.enabled && watch.nextRunAt ? `Next: ${new Date(watch.nextRunAt).toLocaleString()} (${watch.schedule.timeZone})` : `Schedule: ${watch.schedule.localTime} ${watch.schedule.timeZone}`}</small></div>
          <div className="topic-watch-actions">
            <button type="button" className="survey-btn" disabled={busy || running} onClick={() => void scouts.startRun(watch.id, 'watch')}><Play size={11} />{running ? run?.state : 'Run now'}</button>
            <button type="button" className="survey-btn" disabled={busy} onClick={() => void toggle(watch)}>{watch.enabled ? <Pause size={11} /> : <Play size={11} />}{watch.enabled ? 'Pause' : 'Resume'}</button>
            <button type="button" className="survey-btn" disabled={busy || running} onClick={event => open(event.currentTarget, watch)}><Pencil size={11} />Edit</button>
            <button type="button" className="survey-btn" disabled={busy || running} onClick={() => { if (window.confirm(`Delete topic watch “${watch.name}”? Existing reports remain.`)) void scouts.deleteWatch(watch.id); }}><Trash2 size={11} />Delete</button>
          </div>
        </article>;
      })}
      {!watches.length && <p className="topic-watch-empty"><CalendarClock size={15} />No topic watch yet. Manual problem-driven scouting remains available.</p>}
    </div>
    <dialog ref={dialog} className="scout-dialog topic-watch-dialog" aria-labelledby="topic-watch-dialog-title" onClose={() => requestAnimationFrame(() => dialogTrigger.current?.focus())}>
      <form method="dialog" onSubmit={event => { event.preventDefault(); void save(); }}>
        <div className="topic-watch-dialog-heading"><h3 id="topic-watch-dialog-title">{editing ? 'Edit topic watch' : 'New topic watch'}</h3><button type="button" onClick={() => dialog.current?.close()} aria-label="Close watch editor"><X size={15} /></button></div>
        <label>Name<input value={draft.name} onChange={event => setDraft(current => ({ ...current, name: event.target.value }))} /></label>
        <label>Topic<textarea rows={2} value={draft.topic} onChange={event => setDraft(current => ({ ...current, topic: event.target.value }))} /></label>
        <label>Purpose<textarea rows={2} value={draft.purpose} onChange={event => setDraft(current => ({ ...current, purpose: event.target.value }))} /></label>
        <label>Included scope<textarea rows={2} value={draft.scope} onChange={event => setDraft(current => ({ ...current, scope: event.target.value }))} placeholder="One item per line" /></label>
        <label>Exclusions<textarea rows={2} value={draft.exclusions} onChange={event => setDraft(current => ({ ...current, exclusions: event.target.value }))} placeholder="One item per line" /></label>
        <label>Search directions<textarea rows={4} value={draft.directions} onChange={event => setDraft(current => ({ ...current, directions: event.target.value }))} placeholder="query :: reason" /></label>
        <label>Quality policy<textarea rows={2} value={draft.qualityPolicy} onChange={event => setDraft(current => ({ ...current, qualityPolicy: event.target.value }))} /></label>
        <div className="topic-watch-fields">
          <label>Cadence<select value={draft.cadence} onChange={event => setDraft(current => ({ ...current, cadence: event.target.value === 'manual' ? 'manual' : 'daily' }))}><option value="daily">Daily</option><option value="manual">Manual</option></select></label>
          <label>Local time<input type="time" value={draft.localTime} onChange={event => setDraft(current => ({ ...current, localTime: event.target.value }))} /></label>
          <label>Time zone<input value={draft.timeZone} onChange={event => setDraft(current => ({ ...current, timeZone: event.target.value }))} /></label>
          <label>Recency<select value={draft.recencyPolicy} onChange={event => { const value = RECENCY_POLICIES.find(item => item === event.target.value); if (value) setDraft(current => ({ ...current, recencyPolicy: value })); }}><option value="mixed">Mixed</option><option value="recent">Recent only</option><option value="foundational-gap">Foundational gaps</option></select></label>
          <label>Quality threshold<select value={draft.qualityThreshold} onChange={event => { const value = QUALITY_THRESHOLDS.find(item => item === event.target.value); if (value) setDraft(current => ({ ...current, qualityThreshold: value })); }}><option value="medium">Medium</option><option value="high">High</option><option value="low">Low</option></select></label>
          <label>Maximum papers<input type="number" min={1} max={3} value={draft.maxRecommendations} onChange={event => setDraft(current => ({ ...current, maxRecommendations: Number(event.target.value) }))} /></label>
        </div>
        {validation && <p role="alert">{validation}</p>}
        <div><button type="button" className="survey-btn" onClick={() => dialog.current?.close()}>Cancel</button><button type="submit" className="survey-btn survey-btn-primary" disabled={busy}>Save watch</button></div>
      </form>
    </dialog>
  </section>;
}
