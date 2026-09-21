import { useEffect, useId, useRef, useState } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useLiterature } from '../../context/useLiterature';
import type { LiteratureJob, LiteratureJobInput, LiteratureSnapshot } from '../../literatureTypes';
import '../survey/literature.css';

export const parseQueries = (value: string) => [...new Set(value.split('\n').map(query => query.trim()).filter(Boolean))];

export function LiteratureJobForm({ initial, scheduler, busy, error, onSave, onClose }: {
  initial?: Partial<LiteratureJobInput>;
  scheduler?: LiteratureSnapshot['scheduler'];
  busy: boolean;
  error: string | null;
  onSave: (input: LiteratureJobInput) => Promise<boolean>;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const headingId = useId();
  const [name, setName] = useState(initial?.name ?? 'Literature monitor');
  const [brief, setBrief] = useState(initial?.brief ?? '');
  const [queries, setQueries] = useState(initial?.queries?.join('\n') ?? '');
  const [dailyTime, setDailyTime] = useState(initial?.dailyTime ?? '09:00');
  const [enabled, setEnabled] = useState(initial?.enabled ?? true);
  const [expand, setExpand] = useState(initial?.expand ?? false);
  useEffect(() => { dialog.current?.showModal(); }, []);
  return <dialog ref={dialog} className="literature-dialog" aria-labelledby={headingId} onCancel={onClose} onClose={onClose}>
    <form className="literature" onSubmit={async event => {
      event.preventDefault();
      if (await onSave({ name: name.trim(), brief: brief.trim(), queries: parseQueries(queries), dailyTime, enabled, expand })) onClose();
    }}>
      <header className="literature-heading"><h2 id={headingId}>{initial?.name ? 'Edit monitoring job' : 'Create monitoring job'}</h2>
        <button type="button" onClick={onClose} aria-label="Close monitoring job form">Close</button></header>
      <fieldset disabled={busy}>
        <label>Job name<input required maxLength={200} value={name} onChange={event => setName(event.target.value)} /></label>
        <label>Research brief<textarea required rows={3} maxLength={12000} value={brief} onChange={event => setBrief(event.target.value)} /></label>
        <label>Related queries · one per line<textarea required rows={4} maxLength={12000} value={queries} onChange={event => setQueries(event.target.value)} /></label>
        <label>Daily time ({scheduler?.timeZone ?? 'server time zone'})<input type="time" required value={dailyTime} onChange={event => setDailyTime(event.target.value)} /></label>
        <label className="literature-check"><input type="checkbox" checked={enabled} onChange={event => setEnabled(event.target.checked)} />Enable daily monitoring</label>
        <label className="literature-check"><input type="checkbox" checked={expand} onChange={event => setExpand(event.target.checked)} />Allow Codex query expansion for this job</label>
        <p className="literature-note">Optional: sends this brief and queries to the configured Codex provider over the network on each run. Leave unchecked to use only your queries.</p>
        <p className="literature-note">Search queries go to external literature sources. The local server must remain running for daily monitoring. Results stay in Discover until you save them.</p>
        {error && <p role="alert" className="literature-error">{error}</p>}
        <footer className="literature-actions"><button type="button" onClick={onClose}>Cancel</button>
          <button className="literature-primary" disabled={!name.trim() || !brief.trim() || !parseQueries(queries).length || !scheduler}>
            {busy ? 'Saving…' : initial?.name ? 'Save changes' : 'Create monitoring job'}</button></footer>
      </fieldset>
    </form>
  </dialog>;
}

export function AgentJobsView() {
  const { workspaceDir } = useWorkspace();
  const literature = useLiterature(workspaceDir);
  const [editing, setEditing] = useState<LiteratureJob | 'new' | null>(null);
  const [notice, setNotice] = useState('');
  const snapshot = literature.snapshot;
  const busy = literature.busy !== null;
  useEffect(() => { setEditing(null); setNotice(''); }, [workspaceDir]);
  const date = (timestamp?: number) => timestamp === undefined ? 'Not scheduled' : new Date(timestamp).toLocaleString(undefined, { timeZone: snapshot?.scheduler.timeZone });
  return <section className="literature" aria-label="Agent jobs">
    <header className="literature-heading"><div><h2>Agent Jobs</h2><p className="literature-note">Scheduled literature searches. Review findings in Survey / Discover.</p></div>
      <div className="literature-actions"><button disabled={busy} onClick={() => void literature.refresh()}>Refresh</button>
        <button className="literature-primary" disabled={busy || !snapshot} onClick={() => setEditing('new')}>Create monitoring job</button></div></header>
    <p className="literature-meta">Scheduler: {snapshot ? snapshot.scheduler.active ? 'active' : 'inactive' : 'unavailable'} · {snapshot?.scheduler.timeZone ?? 'Time zone unavailable'}</p>
    <p className="literature-note">The local server must remain running. No papers are imported automatically.</p>
    {literature.error && <p role="alert" className="literature-error">{literature.error}</p>}
    {notice && <p role="status" className="literature-note">{notice}</p>}
    {literature.loading && <p role="status">Loading monitoring jobs…</p>}
    {snapshot && !snapshot.jobs.length && <div className="literature-empty"><h3>No monitoring jobs</h3><p>Create a daily search from a research brief. Findings will appear in Discover.</p></div>}
    {snapshot?.jobs.map(job => {
      const running = snapshot.runs.some(run => run.jobId === job.id && run.status === 'running');
      return <article className="literature-row" key={job.id}>
        <header className="literature-heading"><h3>{job.name}</h3><span className="literature-meta">{running ? 'Running' : job.enabled ? 'Enabled' : 'Paused'}</span></header>
        <p className="literature-prose">{job.brief}</p>
        <p className="literature-meta">Daily {job.dailyTime} · {snapshot.scheduler.timeZone} · Codex expansion {job.expand ? 'allowed' : 'off'}</p>
        <p className="literature-meta">Last run: {job.lastRunAt === undefined ? 'Never' : date(job.lastRunAt)} · Next: {job.enabled ? date(job.nextRunAt) : 'Paused'}</p>
        <details><summary>{job.queries.length} search queries</summary><ul>{job.queries.map(query => <li key={query}>{query}</li>)}</ul></details>
        <div className="literature-actions">
          <button disabled={busy || running} onClick={async () => { if (await literature.runJob(job.id)) setNotice(`Run requested for ${job.name}. See run history for its status.`); }}>{running ? 'Running…' : 'Run now'}</button>
          <button disabled={busy} onClick={() => setEditing(job)}>Edit</button>
          <button disabled={busy} onClick={async () => { if (await literature.updateJob(job.id, { ...job, enabled: !job.enabled })) setNotice(`${job.name} ${job.enabled ? 'paused' : 'resumed'}.`); }}>{job.enabled ? 'Pause' : 'Resume'}</button>
          <button disabled={busy || running} onClick={async () => {
            if (window.confirm(`Delete monitoring job “${job.name}”? This cannot be undone. Papers already saved to the vault are not changed.`) && await literature.deleteJob(job.id)) setNotice(`${job.name} deleted.`);
          }}>Delete</button>
        </div>
      </article>;
    })}
    <section className="literature-history" aria-label="Run history"><h3>Run history</h3>
      {!snapshot?.runs.length && <p className="literature-note">No recorded runs.</p>}
      {[...(snapshot?.runs ?? [])].sort((first, second) => second.startedAt - first.startedAt).map(run => <article className="literature-row" key={run.id}>
        <div className="literature-heading"><strong>{snapshot?.jobs.find(job => job.id === run.jobId)?.name ?? `Deleted job · ${run.jobId}`}</strong><span className="literature-meta">{run.status} · {run.resultCount} results</span></div>
        <p className="literature-meta">Started {date(run.startedAt)}{run.finishedAt !== undefined ? ` · Finished ${date(run.finishedAt)}` : ''}</p>
        {run.error && <p className="literature-error">{run.error}</p>}
      </article>)}
    </section>
    {editing && <LiteratureJobForm key={editing === 'new' ? 'new' : editing.id} initial={editing === 'new' ? undefined : editing}
      scheduler={snapshot?.scheduler} busy={busy} error={literature.error} onClose={() => setEditing(null)}
      onSave={input => editing === 'new' ? literature.createJob(input) : literature.updateJob(editing.id, input)} />}
  </section>;
}
