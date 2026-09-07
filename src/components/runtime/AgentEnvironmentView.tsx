import React, { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Blocks,
  BookOpenText,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Code2,
  Copy,
  ExternalLink,
  Eye,
  FileCode2,
  FileText,
  Folder,
  FolderPlus,
  Home,
  Info,
  Plus,
  PlugZap,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
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
import { MarkdownPreview } from './MarkdownPreview';

type AgentFilter = 'all' | AgentEnvEntry['agent'];

const categories = [
  {
    id: 'instructions',
    label: 'Instructions',
    detail: 'Behavior & project rules',
    icon: BookOpenText,
    accent: 'var(--accent-indigo)',
    accentSoft: 'var(--accent-indigo-soft)'
  },
  {
    id: 'skill',
    label: 'Skills',
    detail: 'Reusable agent capabilities',
    icon: Blocks,
    accent: 'var(--color-holds)',
    accentSoft: 'var(--accent-emerald-soft)'
  },
  {
    id: 'mcp',
    label: 'MCP',
    detail: 'External tools & servers',
    icon: PlugZap,
    accent: 'var(--accent-amber)',
    accentSoft: 'var(--accent-amber-soft)'
  },
  {
    id: 'settings',
    label: 'Settings',
    detail: 'Runtime hooks & defaults',
    icon: SlidersHorizontal,
    accent: 'var(--accent-sky)',
    accentSoft: 'var(--accent-sky-soft)'
  }
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
  const [showScopeDropdown, setShowScopeDropdown] = useState(false);

  // Editor enhancements
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');
  const [copiedPath, setCopiedPath] = useState(false);
  const [copiedContent, setCopiedContent] = useState(false);
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const scopeDropdownRef = useRef<HTMLDivElement>(null);

  const fail = (caught: unknown) => setError(String(caught instanceof Error ? caught.message : caught));

  const refresh = async () => {
    setError(null);
    const data = await loadAgentEnv();
    setSnapshot(data);
  };

  useEffect(() => {
    setLoading(true);
    void refresh().catch(fail).finally(() => setLoading(false));
  }, []);

  // Close scope dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (scopeDropdownRef.current && !scopeDropdownRef.current.contains(e.target as Node)) {
        setShowScopeDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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

  // Synchronize scroll between line numbers gutter and textarea
  const handleScroll = () => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  const updateCursor = (el: HTMLTextAreaElement) => {
    const selStart = el.selectionStart;
    const before = el.value.substring(0, selStart);
    const lines = before.split('\n');
    setCursorPos({
      line: lines.length,
      col: lines[lines.length - 1].length + 1
    });
  };

  const scopeEntries = useMemo(
    () => (snapshot?.entries ?? []).filter(entry => (scope === 'global' ? entry.scope === 'global' : entry.projectId === scope)),
    [scope, snapshot]
  );

  const visibleEntries = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return scopeEntries.filter(
      entry =>
        entry.category === categoryFilter &&
        (agentFilter === 'all' || entry.agent === agentFilter) &&
        (!needle || `${entry.label} ${entry.path}`.toLowerCase().includes(needle))
    );
  }, [agentFilter, categoryFilter, query, scopeEntries]);

  const categoryCounts = useMemo(
    () =>
      Object.fromEntries(
        categories.map(category => [
          category.id,
          scopeEntries.filter(entry => entry.category === category.id).length
        ])
      ),
    [scopeEntries]
  );

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
      setSnapshot(current =>
        current
          ? {
              ...current,
              entries: current.entries.map(item => (item.id === entry.id ? entry : item))
            }
          : current
      );
    } catch (caught) {
      fail(caught);
    } finally {
      setSaving(false);
    }
  };

  const handleEditorKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    // Save on Ctrl/Cmd + S
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
      event.preventDefault();
      void save();
      return;
    }

    // Support Tab indentation (insert 2 spaces)
    if (event.key === 'Tab') {
      event.preventDefault();
      const target = event.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const nextContent = content.substring(0, start) + '  ' + content.substring(end);
      setContent(nextContent);
      requestAnimationFrame(() => {
        target.selectionStart = target.selectionEnd = start + 2;
        updateCursor(target);
      });
    }
  };

  const handleCopyPath = () => {
    if (!selectedEntry) return;
    navigator.clipboard.writeText(selectedEntry.path);
    setCopiedPath(true);
    setTimeout(() => setCopiedPath(false), 2000);
  };

  const handleCopyContent = () => {
    navigator.clipboard.writeText(content);
    setCopiedContent(true);
    setTimeout(() => setCopiedContent(false), 2000);
  };

  const handleRevert = () => {
    setContent(savedContent);
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

  const lineCount = useMemo(() => {
    return (content.match(/\n/g)?.length ?? 0) + 1;
  }, [content]);

  const wordCount = useMemo(() => {
    return content.trim() ? content.trim().split(/\s+/).length : 0;
  }, [content]);

  const currentCategory = categories.find(c => c.id === categoryFilter);

  // Formatted JSON preview helper
  const parsedJson = useMemo(() => {
    if (selectedEntry?.kind !== 'json') return null;
    try {
      return JSON.parse(content);
    } catch {
      return null;
    }
  }, [content, selectedEntry?.kind]);

  return (
    <div className="agent-env-container flex-1 flex overflow-hidden bg-[var(--color-paper)]">
      {/* Master Left Sidebar: 340px dense developer panel */}
      <aside className="agent-env-master w-[330px] flex-shrink-0 flex flex-col border-r border-[var(--color-rule)] bg-[var(--color-surface)] select-none">
        {/* Scope Switcher Bar */}
        <div className="p-3 border-b border-[var(--color-rule)] flex flex-col gap-2 bg-[var(--color-surface)]">
          <div className="flex items-center justify-between">
            <span className="text-[0.625rem] font-mono font-semibold uppercase tracking-wider text-[var(--color-ink-muted)]">
              Workspace Scope
            </span>
            <button
              type="button"
              onClick={() => void refresh().catch(fail)}
              className="p-1 rounded text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-paper)] transition-colors"
              title="Refresh files"
              aria-label="Refresh files"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

          <div className="relative" ref={scopeDropdownRef}>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setShowScopeDropdown(!showScopeDropdown)}
                className="flex-1 flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper)] hover:border-[var(--accent-indigo)]/50 text-left transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  {scope === 'global' ? (
                    <Home size={14} className="text-[var(--accent-indigo)] flex-shrink-0" />
                  ) : (
                    <Folder size={14} className="text-[var(--color-holds)] flex-shrink-0" />
                  )}
                  <div className="min-w-0">
                    <div className="text-[0.7813rem] font-mono font-semibold text-[var(--color-ink)] truncate">
                      {scope === 'global' ? 'Global Environment' : activeProject?.name}
                    </div>
                    <div className="text-[0.625rem] font-mono text-[var(--color-ink-muted)] truncate">
                      {scope === 'global' ? snapshot?.home ?? '~' : activeProject?.path}
                    </div>
                  </div>
                </div>
                <ChevronDown size={14} className="text-[var(--color-ink-muted)] flex-shrink-0" />
              </button>

              <button
                type="button"
                onClick={() => void browse(snapshot?.home ?? '~')}
                className="p-2 rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper)] hover:border-[var(--accent-indigo)] hover:text-[var(--accent-indigo)] text-[var(--color-ink-muted)] transition-colors"
                title="Add project directory"
                aria-label="Add project directory"
              >
                <FolderPlus size={15} />
              </button>
            </div>

            {/* Scope Dropdown Menu */}
            {showScopeDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1 z-30 rounded-xl border border-[var(--color-rule)] bg-[var(--color-surface)] shadow-lg p-1.5 space-y-1">
                <button
                  type="button"
                  onClick={() => {
                    setScope('global');
                    setShowScopeDropdown(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left text-xs font-mono transition-colors ${
                    scope === 'global'
                      ? 'bg-[var(--accent-indigo-soft)] text-[var(--accent-indigo)] font-semibold'
                      : 'hover:bg-[var(--color-paper)] text-[var(--color-ink)]'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Home size={14} className="flex-shrink-0" />
                    <div className="truncate">
                      <div>Global (~/)</div>
                      <div className="text-[0.625rem] text-[var(--color-ink-muted)] truncate">{snapshot?.home}</div>
                    </div>
                  </div>
                  {scope === 'global' && <Check size={14} />}
                </button>

                {snapshot?.projects && snapshot.projects.length > 0 && (
                  <div className="pt-1 border-t border-[var(--color-rule)]">
                    <div className="px-2 py-1 text-[0.625rem] font-mono font-semibold uppercase tracking-wider text-[var(--color-ink-muted)]">
                      Registered Projects
                    </div>
                    {snapshot.projects.map(project => (
                      <div
                        key={project.id}
                        className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-mono transition-colors ${
                          scope === project.id
                            ? 'bg-[var(--accent-indigo-soft)] text-[var(--accent-indigo)] font-semibold'
                            : 'hover:bg-[var(--color-paper)] text-[var(--color-ink)]'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setScope(project.id);
                            setShowScopeDropdown(false);
                          }}
                          className="flex-1 flex items-center gap-2 min-w-0 text-left"
                        >
                          <Folder size={14} className="flex-shrink-0" />
                          <div className="truncate">
                            <div className="truncate">{project.name}</div>
                            <div className="text-[0.625rem] text-[var(--color-ink-muted)] truncate" title={project.path}>
                              {project.path}
                            </div>
                          </div>
                        </button>
                        <div className="flex items-center gap-1 pl-1">
                          {scope === project.id && <Check size={14} className="mr-1" />}
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              setRemovingProject(project.id);
                              setShowScopeDropdown(false);
                            }}
                            className="p-1 rounded text-[var(--color-ink-muted)] hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                            title={`Unregister ${project.name}`}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="pt-1 border-t border-[var(--color-rule)]">
                  <button
                    type="button"
                    onClick={() => {
                      setShowScopeDropdown(false);
                      void browse(snapshot?.home ?? '~');
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-mono text-[var(--accent-indigo)] hover:bg-[var(--accent-indigo-soft)] transition-colors"
                  >
                    <FolderPlus size={14} />
                    <span>Register another folder...</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 4 Category Segmented Tabs */}
        <div className="grid grid-cols-2 gap-1.5 p-2.5 border-b border-[var(--color-rule)] bg-[var(--color-paper)]/50">
          {categories.map(cat => {
            const Icon = cat.icon;
            const isSelected = categoryFilter === cat.id;
            const count = categoryCounts[cat.id] ?? 0;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setCategoryFilter(cat.id);
                  setQuery('');
                }}
                className={`flex items-center justify-between p-2 rounded-lg border text-left transition-all ${
                  isSelected
                    ? 'border-[var(--accent-indigo)] bg-[var(--color-surface)] shadow-xs'
                    : 'border-transparent hover:border-[var(--color-rule)] hover:bg-[var(--color-surface)]/70 text-[var(--color-ink-muted)]'
                }`}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <Icon
                    size={14}
                    className={isSelected ? 'text-[var(--accent-indigo)]' : 'text-[var(--color-ink-muted)]'}
                  />
                  <span
                    className={`text-[0.7188rem] font-mono font-medium truncate ${
                      isSelected ? 'text-[var(--color-ink)] font-semibold' : ''
                    }`}
                  >
                    {cat.label}
                  </span>
                </div>
                <span
                  className={`text-[0.625rem] font-mono px-1.5 py-0.5 rounded-full ${
                    isSelected
                      ? 'bg-[var(--accent-indigo-soft)] text-[var(--accent-indigo)] font-bold'
                      : 'bg-[var(--color-rule)]/60 text-[var(--color-ink-muted)]'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search & Agent Filter Bar */}
        <div className="p-2.5 border-b border-[var(--color-rule)] space-y-2">
          <div className="relative flex items-center">
            <Search size={13} className="absolute left-2.5 text-[var(--color-ink-muted)] pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={`Filter ${currentCategory?.label.toLowerCase()}...`}
              className="w-full h-8 pl-8 pr-7 text-xs font-mono rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper)] text-[var(--color-ink)] placeholder:text-[var(--color-ink-muted)] focus:border-[var(--accent-indigo)] focus:outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-2 p-0.5 text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
              >
                <X size={13} />
              </button>
            )}
          </div>

          <div className="flex items-center justify-between gap-1">
            {/* Agent filter chips */}
            <div className="flex items-center gap-1 overflow-x-auto py-0.5">
              {(['all', 'shared', 'claude', 'codex'] as const).map(agent => (
                <button
                  key={agent}
                  type="button"
                  onClick={() => setAgentFilter(agent)}
                  className={`px-2 py-0.5 rounded-md text-[0.625rem] font-mono uppercase tracking-wider transition-colors ${
                    agentFilter === agent
                      ? 'bg-[var(--color-ink)] text-[var(--color-surface)] font-bold'
                      : 'bg-[var(--color-paper)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] border border-[var(--color-rule)]'
                  }`}
                >
                  {agent === 'all' ? 'All' : agent}
                </button>
              ))}
            </div>

            {categoryFilter === 'skill' && (
              <button
                type="button"
                onClick={() => setShowSkillForm(true)}
                className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--accent-indigo)] text-white text-[0.625rem] font-mono font-semibold hover:opacity-90 transition-opacity"
                title="Create a new agent skill"
              >
                <Plus size={11} />
                <span>Skill</span>
              </button>
            )}
          </div>
        </div>

        {/* File Cards List */}
        <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1">
          {visibleEntries.map(entry => {
            const isSelected = selectedId === entry.id;
            return (
              <button
                key={entry.id}
                type="button"
                onClick={() => setSelectedId(entry.id)}
                className={`w-full flex items-start gap-2.5 p-2 rounded-xl text-left border transition-all ${
                  isSelected
                    ? 'border-[var(--accent-indigo)] bg-[var(--accent-indigo-soft)]/40 shadow-xs'
                    : 'border-transparent hover:border-[var(--color-rule)] hover:bg-[var(--color-paper)]'
                }`}
              >
                <div
                  className={`p-1.5 rounded-lg mt-0.5 flex-shrink-0 ${
                    isSelected
                      ? 'bg-[var(--accent-indigo)] text-white'
                      : 'bg-[var(--color-paper)] text-[var(--color-ink-muted)] border border-[var(--color-rule)]'
                  }`}
                >
                  {entry.kind === 'markdown' ? <FileText size={14} /> : <FileCode2 size={14} />}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span
                      className={`text-[0.7813rem] font-mono font-semibold truncate ${
                        isSelected ? 'text-[var(--accent-indigo)]' : 'text-[var(--color-ink)]'
                      }`}
                    >
                      {entry.label}
                    </span>
                    <span
                      className={`text-[0.5625rem] font-mono uppercase px-1 rounded flex-shrink-0 ${
                        entry.exists
                          ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-100/60 dark:bg-emerald-950/60'
                          : 'text-[var(--color-ink-muted)] border border-dashed border-[var(--color-rule)]'
                      }`}
                    >
                      {entry.exists ? 'active' : 'draft'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 mt-1 text-[0.625rem] font-mono text-[var(--color-ink-muted)]">
                    <span className="uppercase font-semibold tracking-wider text-[var(--color-ink)]/70">
                      {entry.agent}
                    </span>
                    <span>·</span>
                    <span className="truncate" title={entry.path}>
                      {entry.path.split('/').slice(-2).join('/')}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}

          {visibleEntries.length === 0 && (
            <div className="py-12 px-4 text-center">
              <div className="inline-flex p-3 rounded-2xl bg-[var(--color-paper)] text-[var(--color-ink-muted)] mb-2">
                <Info size={18} />
              </div>
              <p className="text-xs font-mono text-[var(--color-ink-muted)] leading-relaxed">
                {query
                  ? 'No configuration files match your search.'
                  : categoryFilter === 'skill'
                    ? 'No custom skills defined yet. Click + Skill to create one.'
                    : 'No files in this category.'}
              </p>
              {categoryFilter === 'skill' && !query && (
                <button
                  type="button"
                  onClick={() => setShowSkillForm(true)}
                  className="mt-3 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[var(--accent-indigo)] text-white text-xs font-mono font-semibold hover:opacity-90"
                >
                  <Plus size={13} /> Create skill
                </button>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* Detail / Editor Canvas: Professional Code & Preview Studio */}
      <main className="flex-1 min-w-0 flex flex-col bg-[var(--color-paper)] overflow-hidden">
        {selectedEntry ? (
          <>
            {/* Context Header Bar */}
            <header className="flex-shrink-0 px-4 py-2.5 border-b border-[var(--color-rule)] bg-[var(--color-surface)] flex items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                {/* Breadcrumb line */}
                <div className="flex items-center gap-1.5 text-[0.625rem] font-mono text-[var(--color-ink-muted)]">
                  <span className="font-semibold text-[var(--color-ink)]">
                    {selectedEntry.scope === 'global' ? 'Global (~)' : selectedEntry.projectName}
                  </span>
                  <span>/</span>
                  <span className="uppercase">{selectedEntry.category}</span>
                  <span>/</span>
                  <span className="text-[var(--accent-indigo)] font-bold">{selectedEntry.label}</span>

                  <span className="ml-2 px-1.5 py-0.5 rounded text-[0.5625rem] font-mono uppercase bg-[var(--color-paper)] border border-[var(--color-rule)] text-[var(--color-ink-muted)]">
                    {selectedEntry.kind}
                  </span>

                  <span className="px-1.5 py-0.5 rounded text-[0.5625rem] font-mono uppercase bg-[var(--accent-indigo-soft)] text-[var(--accent-indigo)] font-semibold">
                    {selectedEntry.agent}
                  </span>
                </div>

                {/* File path + Copy Path */}
                <div className="flex items-center gap-2 mt-1">
                  <code
                    className="text-[0.6875rem] font-mono text-[var(--color-ink-muted)] truncate max-w-xl"
                    title={selectedEntry.path}
                  >
                    {selectedEntry.path}
                  </code>
                  <button
                    type="button"
                    onClick={handleCopyPath}
                    className="inline-flex items-center gap-1 text-[0.625rem] font-mono text-[var(--color-ink-muted)] hover:text-[var(--accent-indigo)] transition-colors"
                    title="Copy full file path"
                  >
                    {copiedPath ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
                    <span>{copiedPath ? 'Copied path' : 'Copy path'}</span>
                  </button>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {/* View Mode Toggle: Edit / Preview */}
                <div className="flex items-center p-0.5 rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper)]">
                  <button
                    type="button"
                    onClick={() => setViewMode('edit')}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono transition-colors ${
                      viewMode === 'edit'
                        ? 'bg-[var(--color-surface)] text-[var(--accent-indigo)] font-semibold shadow-xs'
                        : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
                    }`}
                  >
                    <Code2 size={13} />
                    <span>Edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('preview')}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono transition-colors ${
                      viewMode === 'preview'
                        ? 'bg-[var(--color-surface)] text-[var(--accent-indigo)] font-semibold shadow-xs'
                        : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
                    }`}
                  >
                    <Eye size={13} />
                    <span>Preview</span>
                  </button>
                </div>

                {/* Copy Content Button */}
                <button
                  type="button"
                  onClick={handleCopyContent}
                  className="p-1.5 rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper)] hover:border-[var(--accent-indigo)] hover:text-[var(--accent-indigo)] text-[var(--color-ink-muted)] transition-colors"
                  title="Copy full file content"
                >
                  {copiedContent ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                </button>

                {/* Revert Button (if dirty) */}
                {isDirty && (
                  <button
                    type="button"
                    onClick={handleRevert}
                    className="p-1.5 rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper)] hover:border-amber-500 hover:text-amber-600 text-[var(--color-ink-muted)] transition-colors"
                    title="Discard unsaved changes"
                  >
                    <RotateCcw size={14} />
                  </button>
                )}

                {/* Save Button */}
                <button
                  type="button"
                  onClick={() => void save()}
                  disabled={!isDirty || saving}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all ${
                    isDirty
                      ? 'bg-[var(--accent-indigo)] text-white shadow-xs hover:opacity-95 cursor-pointer'
                      : 'bg-[var(--color-rule)]/40 text-[var(--color-ink-muted)] cursor-default'
                  }`}
                >
                  <Save size={13} className={saving ? 'animate-spin' : ''} />
                  <span>{saving ? 'Saving...' : isDirty ? 'Save (⌘S)' : 'Saved'}</span>
                </button>
              </div>
            </header>

            {/* Warning banner if Claude user state */}
            {selectedEntry.id === 'claude-user-state' && (
              <div className="px-4 py-2 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800/50 flex items-center gap-2 text-xs font-mono text-amber-800 dark:text-amber-200">
                <AlertTriangle size={14} className="flex-shrink-0 text-amber-600" />
                <span>
                  This file manages active Claude project state. An automatic backup (<code>.bak</code>) is created before
                  every change.
                </span>
              </div>
            )}

            {/* Error banner */}
            {error && (
              <div className="px-4 py-2 bg-red-50 dark:bg-red-950/50 border-b border-red-200 dark:border-red-900 flex items-center justify-between text-xs font-mono text-red-700 dark:text-red-300">
                <span>{error}</span>
                <button type="button" onClick={() => setError(null)} className="p-1 hover:text-red-900">
                  <X size={13} />
                </button>
              </div>
            )}

            {/* Main Canvas: Editor or Preview */}
            <div className="flex-1 min-h-0 relative flex overflow-hidden">
              {viewMode === 'edit' ? (
                <div className="flex-1 flex min-h-0 overflow-hidden bg-[var(--color-paper)]">
                  {/* Line Numbers Gutter */}
                  <div
                    ref={lineNumbersRef}
                    className="w-12 flex-shrink-0 select-none overflow-hidden py-4 text-right pr-3 font-mono text-[0.75rem] text-[var(--color-ink-muted)]/50 border-r border-[var(--color-rule)]/60 bg-[var(--color-paper)]"
                    style={{ lineHeight: '1.65rem' }}
                    aria-hidden="true"
                  >
                    {Array.from({ length: lineCount }).map((_, i) => (
                      <div
                        key={i + 1}
                        className={cursorPos.line === i + 1 ? 'text-[var(--accent-indigo)] font-bold' : ''}
                      >
                        {i + 1}
                      </div>
                    ))}
                  </div>

                  {/* Textarea Editor */}
                  <textarea
                    ref={textareaRef}
                    value={content}
                    onChange={e => {
                      setContent(e.target.value);
                      updateCursor(e.target);
                    }}
                    onKeyDown={handleEditorKeyDown}
                    onScroll={handleScroll}
                    onSelect={e => updateCursor(e.currentTarget)}
                    onClick={e => updateCursor(e.currentTarget)}
                    onKeyUp={e => updateCursor(e.currentTarget)}
                    disabled={loading}
                    spellCheck={selectedEntry.kind === 'markdown'}
                    className="flex-1 min-h-0 resize-none border-0 p-4 font-mono text-[0.8125rem] text-[var(--color-ink)] bg-transparent outline-none selection:bg-[var(--accent-indigo-soft)] tab-size-2"
                    style={{ lineHeight: '1.65rem' }}
                    aria-label={`Editing ${selectedEntry.label}`}
                  />
                </div>
              ) : (
                /* Preview Mode */
                <div className="flex-1 min-h-0 overflow-y-auto p-6 bg-[var(--color-surface)]">
                  {selectedEntry.kind === 'markdown' ? (
                    <div className="max-w-3xl mx-auto">
                      <MarkdownPreview content={content} />
                    </div>
                  ) : selectedEntry.kind === 'json' ? (
                    <div className="max-w-3xl mx-auto space-y-3">
                      <div className="flex items-center justify-between text-xs font-mono text-[var(--color-ink-muted)] pb-2 border-b border-[var(--color-rule)]">
                        <span>{parsedJson ? 'Valid JSON' : 'Invalid JSON Syntax'}</span>
                        <span>{content.split('\n').length} lines formatted</span>
                      </div>
                      <pre className="p-4 rounded-xl border border-[var(--color-rule)] bg-[var(--color-paper)] font-mono text-xs overflow-x-auto leading-relaxed text-[var(--color-ink)]">
                        <code>{parsedJson ? JSON.stringify(parsedJson, null, 2) : content}</code>
                      </pre>
                    </div>
                  ) : (
                    <pre className="max-w-3xl mx-auto p-4 rounded-xl border border-[var(--color-rule)] bg-[var(--color-paper)] font-mono text-xs overflow-x-auto">
                      <code>{content}</code>
                    </pre>
                  )}
                </div>
              )}
            </div>

            {/* Bottom Status Bar */}
            <footer className="flex-shrink-0 px-4 py-1.5 border-t border-[var(--color-rule)] bg-[var(--color-surface)] flex items-center justify-between text-[0.6875rem] font-mono text-[var(--color-ink-muted)] select-none">
              <div className="flex items-center gap-3">
                <span>
                  Ln {cursorPos.line}, Col {cursorPos.col}
                </span>
                <span>·</span>
                <span>{lineCount} lines</span>
                <span>·</span>
                <span>
                  {content.length.toLocaleString()} chars ({wordCount.toLocaleString()} words)
                </span>
              </div>

              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  {isDirty ? (
                    <>
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                      <span className="text-amber-600 font-semibold">Unsaved changes</span>
                    </>
                  ) : (
                    <>
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span>{selectedEntry.exists ? 'Saved to disk' : 'Unsaved template'}</span>
                    </>
                  )}
                </span>
                <span>·</span>
                <span className="uppercase">{selectedEntry.kind} · UTF-8</span>
                <span>·</span>
                <span>Press ⌘S / Ctrl+S to save</span>
              </div>
            </footer>
          </>
        ) : (
          /* Empty state when no file is selected */
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="p-4 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-rule)] text-[var(--color-ink-muted)] mb-3 shadow-xs">
              <BookOpenText size={24} />
            </div>
            <h3 className="text-sm font-mono font-semibold text-[var(--color-ink)] mb-1">
              Select an agent configuration file
            </h3>
            <p className="text-xs font-mono text-[var(--color-ink-muted)] max-w-sm">
              Inspect or edit rules, instructions, custom skills, MCP connections, and environment settings.
            </p>
          </div>
        )}
      </main>

      {/* Modal: Directory / Project Folder Picker */}
      {picker && (
        <div
          className="kanban-modal-backdrop fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4"
          onMouseDown={() => setPicker(null)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-[var(--color-rule)] bg-[var(--color-surface)] shadow-2xl overflow-hidden flex flex-col"
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-project-title"
            onMouseDown={e => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-[var(--color-rule)] flex items-center justify-between">
              <div>
                <h2 id="add-project-title" className="text-sm font-mono font-bold text-[var(--color-ink)]">
                  Register Project Folder
                </h2>
                <p className="text-xs font-mono text-[var(--color-ink-muted)]">
                  Connect codebases to configure project-specific agent rules and skills
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPicker(null)}
                className="p-1 rounded-lg text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-paper)]"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Path Navigator */}
              <div className="flex items-center gap-1.5 p-1 rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper)]">
                <button
                  type="button"
                  onClick={() => void browse(picker.parent)}
                  className="p-1.5 rounded text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-surface)]"
                  title="Up to parent folder"
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => void browse(picker.home)}
                  className="p-1.5 rounded text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-surface)]"
                  title="Home directory"
                >
                  <Home size={14} />
                </button>
                <div className="flex-1 px-2 py-1 text-xs font-mono text-[var(--color-ink)] truncate" title={picker.dir}>
                  {picker.dir}
                </div>
              </div>

              {/* Subfolder list */}
              <div>
                <label className="block text-xs font-mono font-medium text-[var(--color-ink-muted)] mb-1.5">
                  Subdirectories
                </label>
                <div className="max-h-52 overflow-y-auto rounded-xl border border-[var(--color-rule)] bg-[var(--color-paper)] p-1 space-y-0.5">
                  {picker.entries.map(name => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => void browse(`${picker.dir}/${name}`)}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-xs font-mono text-[var(--color-ink)] hover:bg-[var(--accent-indigo-soft)] hover:text-[var(--accent-indigo)] transition-colors"
                    >
                      <Folder size={14} className="text-[var(--color-ink-muted)] flex-shrink-0" />
                      <span className="truncate">{name}</span>
                    </button>
                  ))}
                  {picker.entries.length === 0 && (
                    <div className="py-6 text-center text-xs font-mono text-[var(--color-ink-muted)]">
                      No subdirectories found in this folder
                    </div>
                  )}
                </div>
              </div>

              {/* Project display name */}
              <div>
                <label htmlFor="project-name" className="block text-xs font-mono font-medium text-[var(--color-ink)] mb-1">
                  Project Display Name (Optional)
                </label>
                <input
                  id="project-name"
                  type="text"
                  value={projectName}
                  onChange={e => setProjectName(e.target.value)}
                  placeholder="Defaults to directory name"
                  className="w-full h-9 px-3 text-xs font-mono rounded-lg border border-[var(--color-rule)] bg-[var(--color-surface)] text-[var(--color-ink)] placeholder:text-[var(--color-ink-muted)] focus:border-[var(--accent-indigo)] focus:outline-none"
                />
              </div>

              {error && <div className="p-2.5 rounded-lg bg-red-50 text-red-700 text-xs font-mono">{error}</div>}

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--color-rule)]">
                <button
                  type="button"
                  onClick={() => setPicker(null)}
                  className="px-3 py-1.5 rounded-lg border border-[var(--color-rule)] text-xs font-mono text-[var(--color-ink)] hover:bg-[var(--color-paper)]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleAddProject()}
                  disabled={saving || !picker.exists}
                  className="px-4 py-1.5 rounded-lg bg-[var(--accent-indigo)] text-white text-xs font-mono font-semibold hover:opacity-90 disabled:opacity-50"
                >
                  {saving ? 'Registering...' : 'Register this folder'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Remove Project Confirmation */}
      {removingProject && (
        <div
          className="kanban-modal-backdrop fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4"
          onMouseDown={() => setRemovingProject(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-[var(--color-rule)] bg-[var(--color-surface)] shadow-2xl p-5 space-y-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="remove-project-title"
            onMouseDown={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 text-amber-600">
              <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950/60">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h2 id="remove-project-title" className="text-sm font-mono font-bold text-[var(--color-ink)]">
                  Unregister Project
                </h2>
                <p className="text-xs font-mono text-[var(--color-ink-muted)]">
                  Remove from Thinking OS workspace list
                </p>
              </div>
            </div>

            <p className="text-xs font-mono text-[var(--color-ink-muted)] leading-relaxed bg-[var(--color-paper)] p-3 rounded-xl border border-[var(--color-rule)]">
              This only removes <code>{snapshot?.projects.find(p => p.id === removingProject)?.name}</code> from the
              workspace list. <strong>No files on your disk will be deleted.</strong>
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--color-rule)]">
              <button
                type="button"
                onClick={() => setRemovingProject(null)}
                className="px-3 py-1.5 rounded-lg border border-[var(--color-rule)] text-xs font-mono text-[var(--color-ink)] hover:bg-[var(--color-paper)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleRemoveProject(removingProject)}
                disabled={saving}
                className="px-4 py-1.5 rounded-lg bg-red-600 text-white text-xs font-mono font-semibold hover:bg-red-700 disabled:opacity-50"
              >
                {saving ? 'Removing...' : 'Unregister project'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create Skill */}
      {showSkillForm && (
        <div
          className="kanban-modal-backdrop fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4"
          onMouseDown={() => setShowSkillForm(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-[var(--color-rule)] bg-[var(--color-surface)] shadow-2xl overflow-hidden flex flex-col"
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-skill-title"
            onMouseDown={e => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-[var(--color-rule)] flex items-center justify-between">
              <div>
                <h2 id="new-skill-title" className="text-sm font-mono font-bold text-[var(--color-ink)]">
                  Create Agent Skill
                </h2>
                <p className="text-xs font-mono text-[var(--color-ink-muted)]">
                  Define reusable capabilities and prompts for your agents
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowSkillForm(false)}
                className="p-1 rounded-lg text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-paper)]"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateSkill} className="p-5 space-y-4">
              <div className="p-3 rounded-xl bg-[var(--accent-indigo-soft)]/40 border border-[var(--accent-indigo)]/20 text-xs font-mono text-[var(--accent-indigo)]">
                Will be created in: <strong>{scope === 'global' ? 'Global (~)' : activeProject?.name}</strong>
              </div>

              <div>
                <label htmlFor="skill-name" className="block text-xs font-mono font-medium text-[var(--color-ink)] mb-1">
                  Skill Name
                </label>
                <input
                  id="skill-name"
                  type="text"
                  autoFocus
                  value={skillName}
                  onChange={e => setSkillName(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                  placeholder="e.g. paper-review or data-analysis"
                  pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                  required
                  className="w-full h-9 px-3 text-xs font-mono rounded-lg border border-[var(--color-rule)] bg-[var(--color-surface)] text-[var(--color-ink)] placeholder:text-[var(--color-ink-muted)] focus:border-[var(--accent-indigo)] focus:outline-none"
                />
                <p className="text-[0.625rem] font-mono text-[var(--color-ink-muted)] mt-1">
                  Use lowercase alphanumeric characters and hyphens (e.g. <code>literature-digest</code>).
                </p>
              </div>

              <div>
                <label htmlFor="skill-agent" className="block text-xs font-mono font-medium text-[var(--color-ink)] mb-1">
                  Target Agent
                </label>
                <select
                  id="skill-agent"
                  value={skillAgent}
                  onChange={e => setSkillAgent(e.target.value as AgentEnvEntry['agent'])}
                  className="w-full h-9 px-2.5 text-xs font-mono rounded-lg border border-[var(--color-rule)] bg-[var(--color-surface)] text-[var(--color-ink)] focus:border-[var(--accent-indigo)] focus:outline-none"
                >
                  <option value="shared">Shared (.agents/skills) - accessible across all agents</option>
                  <option value="claude">Claude Code (.claude/skills) - Claude specific</option>
                  <option value="codex">Codex (.codex/skills) - Codex specific</option>
                </select>
              </div>

              {skillName && (
                <div className="p-2.5 rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper)] text-[0.625rem] font-mono text-[var(--color-ink-muted)] truncate">
                  Path preview:{' '}
                  <span className="text-[var(--color-ink)] font-semibold">
                    {scope === 'global' ? '~' : activeProject?.path}/
                    {skillAgent === 'shared' ? '.agents' : skillAgent === 'claude' ? '.claude' : '.codex'}
                    /skills/{skillName}/SKILL.md
                  </span>
                </div>
              )}

              {error && <div className="p-2.5 rounded-lg bg-red-50 text-red-700 text-xs font-mono">{error}</div>}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--color-rule)]">
                <button
                  type="button"
                  onClick={() => setShowSkillForm(false)}
                  className="px-3 py-1.5 rounded-lg border border-[var(--color-rule)] text-xs font-mono text-[var(--color-ink)] hover:bg-[var(--color-paper)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !skillName}
                  className="px-4 py-1.5 rounded-lg bg-[var(--accent-indigo)] text-white text-xs font-mono font-semibold hover:opacity-90 disabled:opacity-50"
                >
                  {saving ? 'Creating...' : 'Create Skill'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
