import React, { useState } from 'react';
import {
  Search,
  PanelRight,
  Tag,
  Settings,
  Type,
  X,
  Sparkles,
  Folder,
  FolderOpen,
  Home,
  ChevronLeft
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { listWorkspaceDirs, WorkspaceDirListing } from '../../vaultClient';

const FONT_SIZE_PRESETS = [12, 14, 16, 18, 20];

export const TopBar: React.FC = () => {
  const {
    fontSize,
    setFontSize,
    activeTag,
    setActiveTag,
    availableTags,
    searchQuery,
    setSearchQuery,
    isDockOpen,
    toggleDock,
    workspaceDir,
    workspaceLoading,
    workspaceError,
    setWorkspaceDir,
    loadSampleData
  } = useWorkspace();

  const [folderPicker, setFolderPicker] = useState<WorkspaceDirListing | null>(null);
  const [folderPickerLoading, setFolderPickerLoading] = useState(false);
  const [folderPickerError, setFolderPickerError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const browseFolder = async (dir: string) => {
    setFolderPickerLoading(true);
    setFolderPickerError(null);
    try {
      setFolderPicker(await listWorkspaceDirs(dir));
    } catch (error) {
      setFolderPickerError(String(error instanceof Error ? error.message : error));
    } finally {
      setFolderPickerLoading(false);
    }
  };

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
          <button
            id="workspace-dir-btn"
            onClick={() => void browseFolder(workspaceDir)}
            title={workspaceError ?? `Workspace folder: ${workspaceDir} (click to choose)`}
            className="max-w-80 truncate px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800/80 border border-[var(--color-rule)] text-[var(--color-ink)] flex items-center gap-1.5 hover:border-slate-400/60"
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                workspaceError ? 'bg-rose-500' : workspaceLoading ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'
              }`}
            />
            {workspaceDir}
          </button>
        </div>
      </div>

      {folderPicker && (
        <div
          className="kanban-modal-backdrop"
          onMouseDown={event => {
            if (event.target === event.currentTarget) setFolderPicker(null);
          }}
        >
          <div className="kanban-modal-panel" role="dialog" aria-modal="true" aria-labelledby="folder-picker-title">
            <div className="kanban-modal-header">
              <h2 id="folder-picker-title" className="kanban-modal-heading flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-indigo-500" />
                Choose workspace folder
              </h2>
              <button type="button" onClick={() => setFolderPicker(null)} aria-label="Close folder picker" className="p-1 rounded text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-paper)]">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <button type="button" onClick={() => void browseFolder(folderPicker.parent)} title="Parent folder" className="p-1.5 rounded border border-[var(--color-rule)] hover:bg-[var(--color-paper)]">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button type="button" onClick={() => void browseFolder(folderPicker.home)} title="Home folder" className="p-1.5 rounded border border-[var(--color-rule)] hover:bg-[var(--color-paper)]">
                  <Home className="w-4 h-4" />
                </button>
                <div className="min-w-0 flex-1 truncate rounded border border-[var(--color-rule)] bg-[var(--color-surface)] px-3 py-1.5 font-mono text-xs" title={folderPicker.dir}>
                  {folderPicker.dir}
                </div>
              </div>
              <div className="h-72 overflow-y-auto rounded border border-[var(--color-rule)] bg-[var(--color-surface)] p-1">
                {folderPicker.entries.map(name => (
                  <button key={name} type="button" onClick={() => void browseFolder(`${folderPicker.dir}/${name}`)} className="flex w-full items-center gap-2 rounded px-2.5 py-2 text-left text-sm hover:bg-indigo-50 dark:hover:bg-indigo-950/50">
                    <Folder className="w-4 h-4 shrink-0 text-indigo-500" />
                    <span className="truncate">{name}</span>
                  </button>
                ))}
                {!folderPickerLoading && folderPicker.entries.length === 0 && (
                  <div className="p-4 text-center text-sm text-[var(--color-ink-muted)]">No subfolders</div>
                )}
              </div>
              {folderPickerError && <p className="mt-2 text-xs text-rose-600">{folderPickerError}</p>}
              <div className="mt-4 flex justify-end gap-2">
                <button type="button" onClick={() => setFolderPicker(null)} className="rounded border border-[var(--color-rule)] px-3 py-1.5 text-sm hover:bg-[var(--color-paper)]">Cancel</button>
                <button type="button" disabled={folderPickerLoading || !folderPicker.exists} onClick={() => { void setWorkspaceDir(folderPicker.dir); setFolderPicker(null); }} className="rounded bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">Choose this folder</button>
              </div>
            </div>
          </div>
        </div>
      )}

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
          id="seed-sample-btn"
          type="button"
          onClick={() => {
            void loadSampleData();
          }}
          title="Seed and reload rich research content"
          className="px-2.5 py-1.5 rounded-full border border-indigo-200 dark:border-indigo-800/80 bg-indigo-50/70 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-mono text-[0.75rem] flex items-center gap-1.5 transition-all shadow-2xs"
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          <span className="topbar-control-label">Sample Data</span>
        </button>

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
