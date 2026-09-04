import React, { useEffect, useState } from 'react';
import {
  Search,
  Moon,
  Sun,
  PanelRight,
  Filter,
  Tag,
  SlidersHorizontal,
  Sparkles
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { LinkStatus } from '../../types';

export const TopBar: React.FC = () => {
  const {
    theme,
    toggleTheme,
    activeTag,
    setActiveTag,
    availableTags,
    linkStatusFilter,
    setLinkStatusFilter,
    searchQuery,
    setSearchQuery,
    isDockOpen,
    toggleDock,
    workspaceDir,
    workspaceLoading,
    workspaceError,
    setWorkspaceDir
  } = useWorkspace();

  const [dirDraft, setDirDraft] = useState(workspaceDir);
  const [editingDir, setEditingDir] = useState(false);

  useEffect(() => {
    setDirDraft(workspaceDir);
  }, [workspaceDir]);

  return (
    <header
      id="instrument-top-bar"
      className="h-13 border-b border-[var(--color-rule)] bg-[var(--color-surface)] px-5 flex items-center justify-between text-xs select-none shrink-0 z-20"
    >
      {/* Left: Brand and Workspace locator */}
      <div className="flex items-center gap-3.5">
        <div className="flex items-center gap-2.5">
          <div className="w-5 h-5 rounded bg-slate-900 dark:bg-slate-100 flex items-center justify-center text-white dark:text-slate-900 shadow-xs">
            <span className="font-mono text-[11px] font-bold">I</span>
          </div>
          <span className="font-mono tracking-[0.14em] uppercase font-bold text-[13px] text-[var(--color-ink)]">
            THINKING OS
          </span>
          <span className="text-[var(--color-ink-muted)] text-[10px] font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-[var(--color-rule)]">
            v0.1
          </span>
        </div>

        <div className="h-4 w-[1px] bg-[var(--color-rule)]" />

        <div className="flex items-center gap-1.5 font-mono text-[11px]">
          {editingDir ? (
            <form
              onSubmit={event => {
                event.preventDefault();
                setEditingDir(false);
                void setWorkspaceDir(dirDraft);
              }}
            >
              <input
                id="workspace-dir-input"
                autoFocus
                value={dirDraft}
                onChange={event => setDirDraft(event.target.value)}
                onBlur={() => setEditingDir(false)}
                placeholder="~/second-brain"
                spellCheck={false}
                className="w-72 px-2.5 py-0.5 rounded-full bg-[var(--color-paper)] border border-indigo-400 text-[var(--color-ink)] focus:outline-none"
              />
            </form>
          ) : (
            <button
              id="workspace-dir-btn"
              onClick={() => setEditingDir(true)}
              title={workspaceError ?? `Workspace folder: ${workspaceDir} (click to change)`}
              className="max-w-80 truncate px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800/80 border border-[var(--color-rule)] text-[var(--color-ink)] flex items-center gap-1.5 hover:border-slate-400/60"
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  workspaceError ? 'bg-rose-500' : workspaceLoading ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'
                }`}
              />
              {workspaceDir}
            </button>
          )}
        </div>
      </div>

      {/* Center: Filters and Search */}
      <div className="flex items-center gap-3">
        {/* Tag filter */}
        <div className="flex items-center gap-1.5 bg-[var(--color-paper)] border border-[var(--color-rule)] rounded-full px-3 py-1 shadow-2xs hover:border-slate-400/60 transition-colors">
          <Tag className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
          <select
            id="tag-filter-select"
            value={activeTag}
            onChange={e => setActiveTag(e.target.value)}
            className="bg-transparent text-[var(--color-ink)] text-xs font-medium focus:outline-none cursor-pointer pr-1"
          >
            <option value="all">All Topics</option>
            {availableTags.map(tag => (
              <option key={tag} value={tag}>
                #{tag}
              </option>
            ))}
          </select>
        </div>

        {/* Link Status Filter - Soft, colorful pills */}
        <div className="flex items-center bg-slate-100/90 dark:bg-slate-800/80 border border-[var(--color-rule)] rounded-full p-0.5 shadow-2xs">
          <button
            id="status-filter-all"
            onClick={() => setLinkStatusFilter('all')}
            className={`px-3 py-0.5 rounded-full text-[11px] font-sans transition-all ${
              linkStatusFilter === 'all'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-semibold shadow-xs'
                : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
            }`}
          >
            All
          </button>
          <button
            id="status-filter-holds"
            onClick={() => setLinkStatusFilter('holds')}
            className={`px-2.5 py-0.5 rounded-full text-[11px] font-sans flex items-center gap-1.5 transition-all ${
              linkStatusFilter === 'holds'
                ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 font-semibold shadow-xs'
                : 'text-[var(--color-ink-muted)] hover:text-emerald-600 dark:hover:text-emerald-400'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Holds
          </button>
          <button
            id="status-filter-weak"
            onClick={() => setLinkStatusFilter('weak')}
            className={`px-2.5 py-0.5 rounded-full text-[11px] font-sans flex items-center gap-1.5 transition-all ${
              linkStatusFilter === 'weak'
                ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-300 font-semibold shadow-xs'
                : 'text-[var(--color-ink-muted)] hover:text-amber-600 dark:hover:text-amber-400'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            Weak
          </button>
          <button
            id="status-filter-missing"
            onClick={() => setLinkStatusFilter('missing')}
            className={`px-2.5 py-0.5 rounded-full text-[11px] font-sans flex items-center gap-1.5 transition-all ${
              linkStatusFilter === 'missing'
                ? 'bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300 font-semibold shadow-xs'
                : 'text-[var(--color-ink-muted)] hover:text-rose-600 dark:hover:text-rose-400'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            Missing
          </button>
        </div>

        {/* Search */}
        <div className="relative flex items-center">
          <Search className="w-3.5 h-3.5 absolute left-3 text-slate-400 pointer-events-none" />
          <input
            id="global-search-input"
            type="text"
            placeholder="Search argument..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-52 pl-8 pr-7 py-1 text-xs bg-[var(--color-paper)] border border-[var(--color-rule)] rounded-full text-[var(--color-ink)] placeholder:text-slate-400 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/15 transition-all shadow-2xs"
          />
          <kbd className="absolute right-2.5 px-1.5 py-0.2 text-[9px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 border border-[var(--color-rule)] rounded-full pointer-events-none">
            /
          </kbd>
        </div>
      </div>

      {/* Right: Theme and Dock Toggle */}
      <div className="flex items-center gap-2.5">
        <button
          id="theme-toggle-btn"
          onClick={toggleTheme}
          title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} theme`}
          className="p-2 rounded-full border border-[var(--color-rule)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-paper)] hover:border-slate-400/60 transition-all shadow-2xs"
        >
          {theme === 'light' ? <Moon className="w-3.5 h-3.5 text-indigo-500" /> : <Sun className="w-3.5 h-3.5 text-amber-400" />}
        </button>

        <button
          id="dock-toggle-btn"
          onClick={toggleDock}
          title="Toggle right panel (Ctrl/Cmd+J)"
          className={`px-3 py-1.5 flex items-center gap-2 rounded-lg border transition-all duration-150 font-mono text-[11px] select-none ${
            isDockOpen
              ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 border-transparent shadow-xs font-semibold'
              : 'border-[var(--color-rule)] bg-[var(--color-surface)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:border-slate-400 dark:hover:border-slate-600'
          }`}
        >
          <PanelRight className="w-3.5 h-3.5" />
          <span>Panel</span>
          <kbd className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${isDockOpen ? 'bg-white/20 text-white dark:bg-black/10 dark:text-black' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
            ⌘J
          </kbd>
        </button>
      </div>
    </header>
  );
};
