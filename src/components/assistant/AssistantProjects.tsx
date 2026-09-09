import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Folder, FolderOpen, Plus, TriangleAlert, X } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { listWorkspaceDirs, type WorkspaceDirListing } from '../../vaultClient';

export function AssistantProjects() {
  const { workspaceDir, workspaceLoading, codexAssistant } = useWorkspace();
  const { projects, projectDir, projectWarning, selectProject, addProject, removeProject, running, configuration, preferences, session } = codexAssistant;
  const dialog = useRef<HTMLDialogElement>(null);
  const switcher = useRef<HTMLDetailsElement>(null);
  const [listing, setListing] = useState<WorkspaceDirListing | null>(null);
  const [path, setPath] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const disabled = running || workspaceLoading;
  const projectName = (dir: string) => dir.split('/').filter(Boolean).pop() || dir;
  const buttonClass = 'rounded-md px-2 py-1.5 text-[0.75rem] hover:bg-[var(--accent-indigo-soft)]';
  const model = (session ? session.model : preferences.model) || configuration.model;
  const providerId = (session ? session.provider : preferences.provider) || configuration.provider;
  const provider = configuration.providers.find(entry => entry.id === providerId);
  const agent = `Codex · ${provider?.label || providerId || 'default'}${model ? ` · ${model}` : ''}`;

  useEffect(() => {
    const close = (event: Event) => { if (!switcher.current?.contains(event.target as Node)) switcher.current?.removeAttribute('open'); };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && switcher.current?.open && !dialog.current?.open) {
        event.preventDefault();
        event.stopPropagation();
        switcher.current.removeAttribute('open');
        switcher.current.querySelector('summary')?.focus();
      }
    };
    document.addEventListener('pointerdown', close);
    document.addEventListener('focusin', close);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('focusin', close); document.removeEventListener('keydown', escape); };
  }, []);

  async function browse(dir: string) {
    setLoading(true);
    setError('');
    setListing(null);
    try {
      const result = await listWorkspaceDirs(dir);
      setListing(result);
      setPath(result.dir);
      if (!result.exists) setError('Folder does not exist. Choose an existing folder.');
    } catch (caught) { setError(caught instanceof Error ? caught.message : String(caught)); }
    finally { setLoading(false); }
  }

  return (
    <>
      <details ref={switcher} className="assistant-switcher">
        <summary aria-label={`Project: ${projectDir}`} title={`${projectDir}\n${agent}`}>
          <FolderOpen className="w-3.5 h-3.5 shrink-0" aria-hidden />
          <span className="truncate">{projectName(projectDir)}</span>
          {projectWarning && <TriangleAlert className="w-3.5 h-3.5 shrink-0 text-[var(--accent-amber)]" aria-label="Project list unavailable" />}
          <ChevronDown className="w-3 h-3 shrink-0" aria-hidden />
        </summary>
        <div className="assistant-switcher-menu">
          <nav aria-label="Assistant projects" className="max-h-56 overflow-y-auto">
            {projects.map(dir => (
              <div key={dir} className="flex items-center gap-1">
                <button type="button" disabled={disabled} aria-current={dir === projectDir ? 'true' : undefined} aria-label={`Select project: ${dir}`} title={dir} onClick={() => { selectProject(dir); switcher.current?.removeAttribute('open'); switcher.current?.querySelector('summary')?.focus(); }} className={`${buttonClass} flex min-w-0 flex-1 items-center gap-2 text-left`}>
                  {dir === projectDir ? <Check className="w-3.5 h-3.5 shrink-0 text-[var(--accent-indigo)]" aria-hidden /> : <span className="w-3.5 shrink-0" aria-hidden />}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{projectName(dir)}{dir === workspaceDir ? ' · Workspace' : ''}</span>
                    <span className="block truncate font-mono text-[0.6875rem] text-[var(--color-ink-muted)]">{dir}</span>
                  </span>
                </button>
                {dir !== workspaceDir && <button type="button" disabled={disabled || !!projectWarning} className={buttonClass} aria-label={`Remove project: ${dir}`} title="Remove from projects (folder and history are kept)" onClick={() => removeProject(dir)}><X className="w-3 h-3" aria-hidden /></button>}
              </div>
            ))}
          </nav>
          {projectWarning && <p role="alert" className="px-2 py-1 text-[0.75rem] text-[var(--color-ink-muted)]">{projectWarning}</p>}
          <button type="button" disabled={disabled || loading || !!projectWarning} aria-haspopup="dialog" className={`${buttonClass} flex w-full items-center gap-2 border-t border-[var(--color-rule)] text-[var(--color-ink-muted)]`} onClick={() => { switcher.current?.removeAttribute('open'); dialog.current?.showModal(); setPath(projectDir); void browse(projectDir); }}><Plus className="w-3.5 h-3.5" aria-hidden />Add folder</button>
          <p className="truncate px-2 pb-1 text-[0.6875rem] text-[var(--color-ink-muted)]" title={agent}>{agent}</p>
        </div>
      </details>
      <dialog ref={dialog} aria-labelledby="assistant-project-title" className="assistant-history" onClose={() => switcher.current?.querySelector('summary')?.focus()}>
        <div className="flex items-center justify-between border-b border-[var(--color-rule)] p-3">
          <h2 id="assistant-project-title" className="text-xs font-semibold">Choose project folder</h2>
          <button type="button" className={buttonClass} aria-label="Close project picker" onClick={() => dialog.current?.close()}><X className="w-4 h-4" /></button>
        </div>
        <div className="flex min-h-0 flex-col gap-3 p-3">
          <p className="text-[0.75rem] text-[var(--color-ink-muted)]">Choose where the assistant works. Your research workspace stays unchanged.</p>
          <form className="flex gap-2" onSubmit={event => { event.preventDefault(); if (!loading && path.trim()) void browse(path.trim()); }}>
            <input aria-label="Project folder path" disabled={loading} value={path} onChange={event => setPath(event.target.value)} className="min-w-0 flex-1 rounded border border-[var(--color-rule)] bg-[var(--color-paper)] px-2 py-1.5 font-mono text-[0.75rem]" />
            <button type="submit" disabled={loading || !path.trim()} className={buttonClass}>Browse</button>
          </form>
          <div className="flex gap-2">
            <button type="button" disabled={loading || !listing} className={buttonClass} onClick={() => { if (listing) void browse(listing.parent); }}>Parent folder</button>
            <button type="button" disabled={loading || !listing} className={buttonClass} onClick={() => { if (listing) void browse(listing.home); }}>Home folder</button>
          </div>
          <div aria-label="Project folders" aria-busy={loading} className="min-h-24 max-h-60 overflow-y-auto rounded border border-[var(--color-rule)] p-1">
            {loading && <p role="status" className="p-2 text-[0.75rem]">Loading folders…</p>}
            {listing?.entries.map(name => <button type="button" key={name} className={`${buttonClass} flex w-full items-center gap-2 text-left`} onClick={() => void browse(`${listing.dir}/${name}`)}><Folder className="w-3.5 h-3.5 shrink-0" aria-hidden /><span className="truncate">{name}</span></button>)}
            {listing?.exists && !listing.entries.length && <p className="p-2 text-[0.75rem] text-[var(--color-ink-muted)]">No subfolders</p>}
          </div>
          {error && <p role="alert" className="text-[0.75rem] text-[var(--color-ink-muted)]">{error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" className={buttonClass} onClick={() => dialog.current?.close()}>Cancel</button>
            <button type="button" disabled={disabled || loading || !listing?.exists || path !== listing.dir} className={`${buttonClass} border border-[var(--color-rule)]`} onClick={() => { if (listing && addProject(listing.dir)) dialog.current?.close(); else setError('Project could not be saved. Check browser storage and try again.'); }}>Choose this folder</button>
          </div>
        </div>
      </dialog>
    </>
  );
}
