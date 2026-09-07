import { FormEvent, KeyboardEvent, useEffect, useMemo, useState } from 'react';
import {
  Blocks,
  BookOpenText,
  ChevronLeft,
  FileCode2,
  Folder,
  FolderPlus,
  Home,
  Plus,
  PlugZap,
  RefreshCw,
  Save,
  SlidersHorizontal,
  Trash2,
  X
} from 'lucide-react';
import {
  AgentEnvEntry,
  AgentEnvSnapshot,
  addAgentProject,
  createAgentSkill,
  loadAgentEnv,
  loadAgentEnvFile,
  removeAgentProject,
  saveAgentEnvFile
} from '../../runtimeClient';
import { WorkspaceDirListing, listWorkspaceDirs } from '../../vaultClient';

type AgentFilter = 'all' | AgentEnvEntry['agent'];

const categories = [
  { id: 'instructions', label: 'Instructions', detail: 'Behavior and project rules', icon: BookOpenText },
  { id: 'skill', label: 'Skills', detail: 'Reusable agent capabilities', icon: Blocks },
  { id: 'mcp', label: 'MCP', detail: 'Tools and external servers', icon: PlugZap },
  { id: 'settings', label: 'Settings', detail: 'Hooks and runtime defaults', icon: SlidersHorizontal }
] as const;

export function AgentEnvironmentView() {
  const [snapshot, setSnapshot] = useState<AgentEnvSnapshot | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [content, setContent] = useState('');
  const [savedContent, setSavedContent] = useState('');
  const [scope, setScope] = useState<'global' | string>('global');
  const [agentFilter, setAgentFilter] = useState<AgentFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<AgentEnvEntry['category']>('instructions');
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSkillForm, setShowSkillForm] = useState(false);
  const [skillName, setSkillName] = useState('');
  const [skillAgent, setSkillAgent] = useState<AgentEnvEntry['agent']>('shared');
  const [picker, setPicker] = useState<WorkspaceDirListing | null>(null);
  const [projectName, setProjectName] = useState('');
  const [removingProject, setRemovingProject] = useState<string | null>(null);

  const fail = (caught: unknown) => setError(String(caught instanceof Error ? caught.message : caught));

  const refresh = async () => {
    setError(null);
    setSnapshot(await loadAgentEnv());
  };

  useEffect(() => {
    setLoading(true);
    void refresh().catch(fail).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setContent('');
      setSavedContent('');
      return;
    }
    setLoading(true);
    setError(null);
    void loadAgentEnvFile(selectedId)
      .then(file => {
        setContent(file.content);
        setSavedContent(file.content);
      })
      .catch(fail)
      .finally(() => setLoading(false));
  }, [selectedId]);

  const scopeEntries = useMemo(
    () => (snapshot?.entries ?? []).filter(entry => (scope === 'global' ? entry.scope === 'global' : entry.projectId === scope)),
    [scope, snapshot]
  );

  const visibleEntries = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return scopeEntries.filter(entry =>
      entry.category === categoryFilter &&
      (agentFilter === 'all' || entry.agent === agentFilter) &&
      (!needle || `${entry.label} ${entry.path}`.toLowerCase().includes(needle))
    );
  }, [agentFilter, categoryFilter, query, scopeEntries]);

  const categoryCounts = useMemo(() => Object.fromEntries(categories.map(category => [
    category.id,
    scopeEntries.filter(entry => entry.category === category.id).length
  ])), [scopeEntries]);

  useEffect(() => {
    if (visibleEntries.some(entry => entry.id === selectedId)) return;
    setSelectedId(visibleEntries[0]?.id ?? null);
  }, [selectedId, visibleEntries]);

  const selectedEntry = snapshot?.entries.find(entry => entry.id === selectedId) ?? null;
  const isDirty = content !== savedContent;
  const activeProject = snapshot?.projects.find(project => project.id === scope) ?? null;

  const save = async () => {
    if (!selectedId || !isDirty) return;
    setSaving(true);
    setError(null);
    try {
      const entry = await saveAgentEnvFile(selectedId, content);
      setSavedContent(content);
      setSnapshot(current => current ? { ...current, entries: current.entries.map(item => item.id === entry.id ? entry : item) } : current);
    } catch (caught) {
      fail(caught);
    } finally {
      setSaving(false);
    }
  };

  const handleEditorKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
      event.preventDefault();
      void save();
    }
  };

  const browse = async (dir: string) => {
    try {
      setPicker(await listWorkspaceDirs(dir));
    } catch (caught) {
      fail(caught);
    }
  };

  const handleAddProject = async () => {
    if (!picker) return;
    setSaving(true);
    setError(null);
    try {
      const projects = await addAgentProject(picker.dir, projectName);
      setPicker(null);
      setProjectName('');
      await refresh();
      setScope(projects[projects.length - 1].id);
    } catch (caught) {
      fail(caught);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveProject = async (id: string) => {
    setSaving(true);
    setError(null);
    try {
      await removeAgentProject(id);
      setRemovingProject(null);
      setScope('global');
      await refresh();
    } catch (caught) {
      fail(caught);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateSkill = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const created = await createAgentSkill(scope, skillAgent, skillName);
      setShowSkillForm(false);
      setSkillName('');
      await refresh();
      setCategoryFilter('skill');
      setSelectedId(created.entry.id);
    } catch (caught) {
      fail(caught);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="agent-env">
      <nav className="agent-env-scopes" aria-label="Agent environment scopes">
        <p className="agent-env-scopes-heading">Scope</p>
        <button className={`agent-env-scope ${scope === 'global' ? 'active' : ''}`} onClick={() => setScope('global')}>
          <Home size={14} />
          <span><strong>Global</strong><small>{snapshot?.home ?? '~'}</small></span>
        </button>

        <p className="agent-env-scopes-heading">Projects</p>
        {snapshot?.projects.map(project => (
          <div key={project.id} className={`agent-env-scope-row ${scope === project.id ? 'active' : ''}`}>
            <button className="agent-env-scope" onClick={() => setScope(project.id)}>
              <Folder size={14} />
              <span><strong>{project.name}</strong><small title={project.path}>{project.path}</small></span>
            </button>
            <button className="agent-env-scope-remove" onClick={() => setRemovingProject(project.id)} title={`Remove ${project.name}`} aria-label={`Remove ${project.name}`}>
              <Trash2 size={13} />
            </button>
          </div>
        ))}
        {!snapshot?.projects.length && <p className="agent-env-empty">No projects registered yet.</p>}
        <button className="agent-env-add-project" onClick={() => void browse(snapshot?.home ?? '~')}>
          <FolderPlus size={14} /> Add project
        </button>
      </nav>

      <nav className="agent-env-categories" aria-label="Configuration categories">
        <div className="agent-env-categories-heading">
          <p>{scope === 'global' ? 'Global' : activeProject?.name}</p>
          <strong>Configuration</strong>
        </div>
        {categories.map(category => {
          const Icon = category.icon;
          return (
            <button
              key={category.id}
              className={`agent-env-category is-${category.id} ${categoryFilter === category.id ? 'active' : ''}`}
              onClick={() => { setCategoryFilter(category.id); setQuery(''); }}
              aria-current={categoryFilter === category.id ? 'page' : undefined}
            >
              <Icon size={16} />
              <span><strong>{category.label}</strong><small>{category.detail}</small></span>
              <b>{categoryCounts[category.id]}</b>
            </button>
          );
        })}
      </nav>

      <aside className="agent-env-sidebar" aria-label="Agent configuration files">
        <div className="agent-env-toolbar">
          <div>
            <p className="agent-env-kicker">{categories.find(category => category.id === categoryFilter)?.label}</p>
            <strong>{visibleEntries.length} of {categoryCounts[categoryFilter] ?? 0} files</strong>
          </div>
          <div className="agent-env-actions">
            {categoryFilter === 'skill' && <button onClick={() => setShowSkillForm(true)} title="Create skill"><Plus size={14} /></button>}
            <button onClick={() => void refresh().catch(fail)} title="Refresh files"><RefreshCw size={14} /></button>
          </div>
        </div>
        <input className="agent-env-search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Filter files…" aria-label="Filter agent configuration files" />
        <div className="agent-env-filters is-single">
          <select value={agentFilter} onChange={event => setAgentFilter(event.target.value as AgentFilter)} aria-label="Filter by agent">
            <option value="all">All agents</option><option value="shared">Shared</option><option value="claude">Claude Code</option><option value="codex">Codex</option>
          </select>
        </div>
        <div className="agent-env-file-list">
          {visibleEntries.map(entry => (
            <button key={entry.id} className={`agent-env-file ${selectedId === entry.id ? 'active' : ''}`} onClick={() => setSelectedId(entry.id)}>
              <FileCode2 size={14} />
              <span>
                <strong>{entry.label}</strong>
                <small>{entry.agent}</small>
              </span>
              <i className={entry.exists ? 'exists' : ''} title={entry.exists ? 'File exists' : 'Created on save'} />
            </button>
          ))}
          {!visibleEntries.length && <p className="agent-env-empty">No files in this category.</p>}
        </div>
      </aside>

      <section className="agent-env-editor">
        {selectedEntry ? (
          <>
            <header className="agent-env-editor-header">
              <div>
                <p className={`agent-env-editor-category is-${selectedEntry.category}`}>{selectedEntry.category}</p>
                <h2>{selectedEntry.label}</h2>
                <code title={selectedEntry.path}>{selectedEntry.agent} · {selectedEntry.projectName ?? 'global'} · {selectedEntry.path}</code>
              </div>
              <button className="engine-add-btn" onClick={() => void save()} disabled={!isDirty || saving}>
                <Save size={13} /> {saving ? 'Saving…' : isDirty ? 'Save changes' : 'Saved'}
              </button>
            </header>
            {selectedEntry.id === 'claude-user-state' && <p className="agent-env-warning">This file also contains Claude project state. A <code>.bak</code> copy is written before every change.</p>}
            {error && <p className="runtime-error agent-env-error" role="alert">{error}</p>}
            <textarea
              className="agent-env-textarea"
              value={content}
              onChange={event => setContent(event.target.value)}
              onKeyDown={handleEditorKeyDown}
              disabled={loading}
              spellCheck={selectedEntry.kind === 'markdown'}
              aria-label={`Edit ${selectedEntry.label}`}
            />
            <footer className="agent-env-status">
              <span>{selectedEntry.exists ? 'Existing file' : 'New file · created on save'}</span>
              <span>{content.length.toLocaleString()} chars · {selectedEntry.kind.toUpperCase()} · Cmd/Ctrl+S</span>
            </footer>
          </>
        ) : (
          <div className="agent-env-editor-empty">
            {error && <p className="runtime-error" role="alert">{error}</p>}
            <p>{categoryFilter === 'skill' ? 'No skills here yet. Use + to create one.' : 'No files in this category. Files are created when you save.'}</p>
          </div>
        )}
      </section>

      {picker && (
        <div className="kanban-modal-backdrop" onMouseDown={() => setPicker(null)}>
          <div className="kanban-modal-panel" role="dialog" aria-modal="true" aria-labelledby="add-project-title" onMouseDown={event => event.stopPropagation()}>
            <div className="kanban-modal-header">
              <h2 id="add-project-title" className="kanban-modal-heading">Add project folder</h2>
              <button className="engine-dialog-close" onClick={() => setPicker(null)} aria-label="Close project picker"><X size={16} /></button>
            </div>
            <div className="kanban-modal-form">
              <div className="agent-env-picker-path">
                <button onClick={() => void browse(picker.parent)} title="Parent folder" aria-label="Parent folder"><ChevronLeft size={14} /></button>
                <button onClick={() => void browse(picker.home)} title="Home folder" aria-label="Home folder"><Home size={14} /></button>
                <code title={picker.dir}>{picker.dir}</code>
              </div>
              <div className="agent-env-picker-list">
                {picker.entries.map(name => (
                  <button key={name} onClick={() => void browse(`${picker.dir}/${name}`)}>
                    <Folder size={14} /> {name}
                  </button>
                ))}
                {!picker.entries.length && <p className="agent-env-empty">No subfolders</p>}
              </div>
              <div className="form-field">
                <label htmlFor="project-name">Display name (optional)</label>
                <input id="project-name" value={projectName} onChange={event => setProjectName(event.target.value)} placeholder="Defaults to folder name" />
              </div>
              {error && <p className="runtime-error" role="alert">{error}</p>}
              <div className="task-editor-actions">
                <button type="button" className="task-editor-button is-secondary" onClick={() => setPicker(null)}>Cancel</button>
                <button type="button" className="task-editor-button is-primary" disabled={saving || !picker.exists} onClick={() => void handleAddProject()}>Add this folder</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {removingProject && (
        <div className="kanban-modal-backdrop" onMouseDown={() => setRemovingProject(null)}>
          <div className="kanban-modal-panel" role="dialog" aria-modal="true" aria-labelledby="remove-project-title" onMouseDown={event => event.stopPropagation()}>
            <div className="kanban-modal-header">
              <h2 id="remove-project-title" className="kanban-modal-heading">Remove project</h2>
              <button className="engine-dialog-close" onClick={() => setRemovingProject(null)} aria-label="Close remove dialog"><X size={16} /></button>
            </div>
            <div className="kanban-modal-form">
              <p className="task-editor-tip">
                Removes <code>{snapshot?.projects.find(project => project.id === removingProject)?.path}</code> from this list only.
                No files on disk are deleted.
              </p>
              <div className="task-editor-actions">
                <button type="button" className="task-editor-button is-secondary" onClick={() => setRemovingProject(null)}>Cancel</button>
                <button type="button" className="task-editor-button is-primary" disabled={saving} onClick={() => void handleRemoveProject(removingProject)}>Remove from list</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showSkillForm && (
        <div className="kanban-modal-backdrop" onMouseDown={() => setShowSkillForm(false)}>
          <div className="kanban-modal-panel" role="dialog" aria-modal="true" aria-labelledby="new-skill-title" onMouseDown={event => event.stopPropagation()}>
            <div className="kanban-modal-header">
              <h2 id="new-skill-title" className="kanban-modal-heading">Create skill</h2>
              <button className="engine-dialog-close" onClick={() => setShowSkillForm(false)} aria-label="Close skill dialog"><X size={16} /></button>
            </div>
            <form className="kanban-modal-form" onSubmit={handleCreateSkill}>
              <p className="task-editor-tip">Created in {scope === 'global' ? 'your home directory' : activeProject?.path}.</p>
              <div className="form-field"><label htmlFor="skill-name">Name</label><input id="skill-name" autoFocus value={skillName} onChange={event => setSkillName(event.target.value)} placeholder="paper-review" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" required /></div>
              <div className="form-field"><label htmlFor="skill-agent">Agent</label><select id="skill-agent" value={skillAgent} onChange={event => setSkillAgent(event.target.value as AgentEnvEntry['agent'])}><option value="shared">Shared (.agents/skills)</option><option value="claude">Claude Code (.claude/skills)</option><option value="codex">Codex (.codex/skills)</option></select></div>
              <div className="task-editor-actions"><button type="button" className="task-editor-button is-secondary" onClick={() => setShowSkillForm(false)}>Cancel</button><button type="submit" className="task-editor-button is-primary" disabled={saving || !skillName}>Create skill</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
