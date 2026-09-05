import React, { useEffect, useState } from 'react';
import {
  Search,
  PanelRight,
  Tag,
  Settings,
  Type,
  X
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { LinkStatus } from '../../types';

const FONT_SIZE_PRESETS = [12, 14, 16, 18, 20];

export const TopBar: React.FC = () => {
  const {
    fontSize,
    setFontSize,
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
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    setDirDraft(workspaceDir);
  }, [workspaceDir]);

  return (
    <header
      id="instrument-top-bar"
      className="h-13 border-b border-[var(--color-rule)] bg-[var(--color-surface)] px-5 flex items-center justify-between text-xs select-none shrink-0 z-20"
    >
      {/* Left: Brand and Workspace locator */}
      <div className="topbar-left flex items-center gap-3.5 min-w-0">
        <div className="topbar-identity flex items-center gap-2.5 shrink-0">
          <div className="w-5 h-5 rounded bg-slate-900 dark:bg-slate-100 flex items-center justify-center text-white dark:text-slate-900 shadow-xs">
            <span className="font-mono text-[0.8125rem] font-bold">I</span>
          </div>
          <span className="font-mono tracking-[0.14em] uppercase font-bold text-[0.9688rem] text-[var(--color-ink)]">
            THINKING OS
          </span>
          <span className="topbar-version text-[var(--color-ink-muted)] text-[0.75rem] font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-[var(--color-rule)]">
            v0.1
          </span>
        </div>

        <div className="topbar-workspace-divider h-4 w-[1px] bg-[var(--color-rule)]" />

        <div className="topbar-workspace flex items-center gap-1.5 font-mono text-[0.8125rem] min-w-0">
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
      <div className="topbar-center flex items-center gap-3">
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
            className={`px-3 py-0.5 rounded-full text-[0.8125rem] font-sans transition-all ${
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
            className={`px-2.5 py-0.5 rounded-full text-[0.8125rem] font-sans flex items-center gap-1.5 transition-all ${
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
            className={`px-2.5 py-0.5 rounded-full text-[0.8125rem] font-sans flex items-center gap-1.5 transition-all ${
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
            className={`px-2.5 py-0.5 rounded-full text-[0.8125rem] font-sans flex items-center gap-1.5 transition-all ${
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
          <kbd className="absolute right-2.5 px-1.5 py-0.2 text-[0.7188rem] font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 border border-[var(--color-rule)] rounded-full pointer-events-none">
            /
          </kbd>
        </div>
      </div>

      {/* Right: Settings, Theme and Dock Toggle */}
      <div className="topbar-actions relative flex items-center gap-2.5 shrink-0">
        <button
          id="app-settings-btn"
          onClick={() => setShowSettings(current => !current)}
          title="Display settings"
          aria-expanded={showSettings}
          className={`px-2.5 py-1.5 rounded-full border font-mono text-[0.75rem] flex items-center gap-1.5 transition-all shadow-2xs ${
            showSettings
              ? 'border-indigo-400 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
              : 'border-[var(--color-rule)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-paper)] hover:border-slate-400/60'
          }`}
        >
          <Settings className="w-3.5 h-3.5" />
          <span className="topbar-control-label">{fontSize}px</span>
        </button>

        {showSettings && (
          <div
            className="kanban-modal-backdrop"
            onMouseDown={event => {
              if (event.target === event.currentTarget) setShowSettings(false);
            }}
          >
            <div
              id="app-settings-popover"
              role="dialog"
              aria-modal="true"
              aria-labelledby="app-settings-title"
              className="kanban-modal-panel"
            >
              <div className="kanban-modal-header">
                <h2 id="app-settings-title" className="kanban-modal-heading flex items-center gap-2">
                  <Settings className="w-3.5 h-3.5 text-indigo-500" />
                  Display settings
                </h2>
                <button
                  type="button"
                  onClick={() => setShowSettings(false)}
                  aria-label="Close settings"
                  className="p-1 rounded text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-paper)]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5">
                <div className="flex items-center gap-2 mb-3 font-mono text-xs font-semibold text-[var(--color-ink)]">
                  <Type className="w-3.5 h-3.5 text-indigo-500" />
                  Font size
                </div>

                <div className="grid grid-cols-5 gap-1.5">
                  {FONT_SIZE_PRESETS.map(size => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setFontSize(size)}
                      className={`rounded-md border py-1.5 font-mono text-[0.75rem] transition-colors ${
                        fontSize === size
                          ? 'border-indigo-500 bg-indigo-600 text-white'
                          : 'border-[var(--color-rule)] bg-[var(--color-surface)] text-[var(--color-ink-muted)] hover:border-indigo-300 hover:text-[var(--color-ink)]'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>

                <input
                  aria-label="Font size"
                  type="range"
                  min="11"
                  max="24"
                  step="1"
                  value={fontSize}
                  onChange={event => setFontSize(Number(event.target.value))}
                  className="mt-3 h-1.5 w-full cursor-pointer accent-indigo-600"
                />
              </div>
            </div>
          </div>
        )}

        <button
          id="dock-toggle-btn"
          onClick={toggleDock}
          title="Toggle right panel (Ctrl/Cmd+J)"
          className={`px-3 py-1.5 flex items-center gap-2 rounded-lg border transition-all duration-150 font-mono text-[0.8125rem] select-none ${
            isDockOpen
              ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 border-transparent shadow-xs font-semibold'
              : 'border-[var(--color-rule)] bg-[var(--color-surface)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:border-slate-400 dark:hover:border-slate-600'
          }`}
        >
          <PanelRight className="w-3.5 h-3.5" />
          <span className="topbar-control-label">Panel</span>
          <kbd className={`topbar-shortcut text-[0.7188rem] font-mono px-1.5 py-0.5 rounded ${isDockOpen ? 'bg-white/20 text-white dark:bg-black/10 dark:text-black' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
            ⌘J
          </kbd>
        </button>
      </div>
    </header>
  );
};
