import React, { useEffect, useRef, useState } from 'react';
import {
  PanelRight,
  Settings,
  Type,
  X,
  Moon,
  Folder,
  FolderOpen,
  Home,
  ChevronLeft,
  Bot,
  Cpu,
  Check
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { listWorkspaceDirs, WorkspaceDirListing } from '../../vaultClient';

const FONT_SIZE_PRESETS = [12, 14, 16, 18, 20];

export const TopBar: React.FC = () => {
  const {
    fontSize,
    setFontSize,
    isDockOpen,
    toggleDock,
    workspaceDir,
    workspaceLoading,
    workspaceError,
    setWorkspaceDir,
    loadSampleData,
    theme,
    toggleTheme,
    darkVariant,
    setDarkVariant,
    codexAssistant
  } = useWorkspace();

  const [folderPicker, setFolderPicker] = useState<WorkspaceDirListing | null>(null);
  const [folderPickerLoading, setFolderPickerLoading] = useState(false);
  const [folderPickerError, setFolderPickerError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const settingsDialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (showSettings && !settingsDialog.current?.open) settingsDialog.current?.showModal();
  }, [showSettings]);

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

      {/* Right: Settings, Theme and Dock Toggle */}
      <div className="topbar-actions relative flex items-center gap-2.5 shrink-0">

        <button
          id="app-settings-btn"
          onClick={() => setShowSettings(current => !current)}
          title="Settings"
          aria-label="Settings"
          aria-haspopup="dialog"
          aria-expanded={showSettings}
          className={`px-2.5 py-1.5 rounded-full border font-mono text-[0.75rem] flex items-center gap-1.5 transition-all shadow-2xs ${
            showSettings
              ? 'border-indigo-400 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
              : 'border-[var(--color-rule)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-paper)] hover:border-slate-400/60'
          }`}
        >
          <Settings className="w-3.5 h-3.5" />
          <span className="topbar-control-label">Settings</span>
        </button>

        {showSettings && (
            <dialog
              ref={settingsDialog}
              id="app-settings-popover"
              role="dialog"
              aria-modal="true"
              aria-labelledby="app-settings-title"
              className="kanban-modal-panel app-settings-dialog"
              onClose={() => setShowSettings(false)}
              onClick={event => {
                if (event.target !== event.currentTarget) return;
                const bounds = event.currentTarget.getBoundingClientRect();
                if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) event.currentTarget.close();
              }}
            >
              <div className="kanban-modal-header">
                <h2 id="app-settings-title" className="kanban-modal-heading flex items-center gap-2">
                  <Settings className="w-3.5 h-3.5 text-indigo-500" />
                  Settings
                </h2>
                <button
                  type="button"
                  onClick={() => settingsDialog.current?.close()}
                  aria-label="Close settings"
                  className="p-1 rounded text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-paper)]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 overflow-y-auto">
                <div className="flex items-center gap-2 mb-3 font-mono text-xs font-semibold text-[var(--color-ink)]">
                  <Type className="w-3.5 h-3.5 text-indigo-500" />
                  Interface font size · {fontSize}px
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

                <div className="mt-5 pt-4 border-t border-[var(--color-rule)]">
                  <div className="flex items-center gap-2 mb-3 font-mono text-xs font-semibold text-[var(--color-ink)]">
                    <Bot className="w-3.5 h-3.5 text-indigo-500" />
                    Assistant panel font size
                  </div>
                  <input
                    aria-label="Assistant panel font size"
                    type="range"
                    min="11"
                    max="24"
                    step="1"
                    value={codexAssistant.preferences.fontSize}
                    onChange={event => codexAssistant.setPreferences(current => ({ ...current, fontSize: Number(event.target.value) }))}
                    className="h-1.5 w-full cursor-pointer accent-indigo-600"
                  />
                  <p className="mt-1 font-mono text-[0.6875rem] text-[var(--color-ink-muted)]">{codexAssistant.preferences.fontSize}px</p>
                </div>

                <div className="mt-5 pt-4 border-t border-[var(--color-rule)]">
                  <div className="flex items-center gap-2 mb-1 font-mono text-xs font-semibold text-[var(--color-ink)]">
                    <Moon className="w-3.5 h-3.5 text-indigo-500" />
                    Appearance
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={toggleTheme}
                      className="rounded-md border border-[var(--color-rule)] px-2.5 py-1 font-mono text-[0.75rem] text-[var(--color-ink)] hover:border-indigo-400"
                    >
                      {theme === 'dark' ? 'Light mode' : 'Dark mode'}
                    </button>
                    {theme === 'dark' && (['claude', 'mocha'] as const).map(variant => (
                      <button
                        key={variant}
                        type="button"
                        onClick={() => setDarkVariant(variant)}
                        aria-pressed={darkVariant === variant}
                        className={`rounded-md border px-2.5 py-1 font-mono text-[0.75rem] capitalize transition-colors ${
                          darkVariant === variant
                            ? 'border-indigo-500 bg-indigo-600 text-white'
                            : 'border-[var(--color-rule)] text-[var(--color-ink-muted)] hover:border-indigo-300 hover:text-[var(--color-ink)]'
                        }`}
                      >
                        {variant}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-[var(--color-rule)]">
                  <div className="flex items-center gap-2 mb-1 font-mono text-xs font-semibold text-[var(--color-ink)]">
                    <Cpu className="w-3.5 h-3.5 text-indigo-500" />
                    Assistant model
                  </div>
                  <p className="mb-2 text-[0.6875rem] text-[var(--color-ink-muted)]">
                    Providers and credentials come from your local Codex configuration; this only chooses which to use.
                  </p>
                  <div className="mb-3">
                    <span className="font-mono text-[0.6875rem] text-[var(--color-ink-muted)] block mb-1.5">Provider</span>
                    <div className="space-y-1">
                      <button
                        type="button"
                        onClick={() => codexAssistant.setPreferences(current => ({ ...current, provider: '' }))}
                        className={`w-full flex items-center justify-between p-2 rounded-lg border text-left font-mono text-xs transition-all ${
                          codexAssistant.preferences.provider === ''
                            ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/40 text-[var(--color-ink)] font-semibold shadow-2xs'
                            : 'border-[var(--color-rule)] bg-[var(--color-surface)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:border-slate-400'
                        }`}
                      >
                        <span>Codex default{codexAssistant.configuration.provider ? ` (${codexAssistant.configuration.provider})` : ''}</span>
                        {codexAssistant.preferences.provider === '' && <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />}
                      </button>
                      {codexAssistant.configuration.providers.map(provider => {
                        const isSelected = codexAssistant.preferences.provider === provider.id;
                        return (
                          <button
                            key={provider.id}
                            type="button"
                            onClick={() => codexAssistant.setPreferences(current => ({ ...current, provider: provider.id }))}
                            className={`w-full flex items-center justify-between p-2 rounded-lg border text-left font-mono text-xs transition-all ${
                              isSelected
                                ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/40 text-[var(--color-ink)] font-semibold shadow-2xs'
                                : 'border-[var(--color-rule)] bg-[var(--color-surface)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:border-slate-400'
                            }`}
                          >
                            <span className="truncate mr-2">{provider.label}{provider.baseUrl ? ` — ${provider.baseUrl}` : ''}</span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <label className="form-field">
                    <span className="font-mono text-[0.6875rem] text-[var(--color-ink-muted)]">Model</span>
                    <input
                      aria-label="Model"
                      value={codexAssistant.preferences.model}
                      maxLength={120}
                      onChange={event => codexAssistant.setPreferences(current => ({ ...current, model: event.target.value }))}
                      placeholder={codexAssistant.configuration.model || 'Codex default'}
                      spellCheck={false}
                    />
                  </label>
                  {codexAssistant.configurationError && (
                    <p role="alert" className="mt-2 text-[0.6875rem] text-[var(--color-missing)]">{codexAssistant.configurationError}</p>
                  )}
                  <div className="mt-2 flex items-center justify-between gap-2 font-mono text-[0.6875rem] text-[var(--color-ink-muted)]">
                    <span>Applies to new conversations.</span>
                    <button type="button" className="underline" onClick={() => void codexAssistant.reloadConfiguration()}>Reload local config</button>
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-[var(--color-rule)]">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-mono text-xs font-semibold text-[var(--color-ink)]">
                        Sample research vault
                      </div>
                      <p className="text-[0.6875rem] text-[var(--color-ink-muted)] mt-0.5">
                        Populate with example questions, claims, and pipeline tasks.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        await loadSampleData();
                        settingsDialog.current?.close();
                      }}
                      className="shrink-0 px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 border border-[var(--color-rule)] text-[var(--color-ink)] font-mono text-[0.75rem] hover:border-indigo-400 hover:text-indigo-600 transition-colors"
                    >
                      Load Sample
                    </button>
                  </div>
                </div>
              </div>
            </dialog>
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
