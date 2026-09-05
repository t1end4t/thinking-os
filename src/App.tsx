import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { WorkspaceProvider, useWorkspace } from './context/WorkspaceContext';
import { TopBar } from './components/shell/TopBar';
import { Rail } from './components/shell/Rail';
import { Inspector } from './components/shell/Inspector';
import { MapSurface } from './components/map/MapSurface';
import { SurveySurface } from './components/survey/SurveySurface';
import { PapersSurface } from './components/papers/PapersSurface';
import { ExperimentsSurface } from './components/experiments/ExperimentsSurface';
import { AssistantDock } from './components/assistant/AssistantDock';
import { TasksSurface } from './components/tasks/TasksSurface';
import { RuntimeSurface } from './components/runtime/RuntimeSurface';
import { TaskEditorPanel } from './components/shell/TaskEditorPanel';

const WorkspaceShell: React.FC = () => {
  const {
    activeSurface,
    selectedLinkId,
    setSelectedLinkId,
    clearSelection,
    toggleDock,
    taskEditor,
    closeTaskEditor
  } = useWorkspace();

  // Global Keyboard Shortcuts (Ctrl/Cmd+J for dock, Esc for inspector/clear selection, / for search)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle Assistant Dock: Cmd+J or Ctrl+J
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        toggleDock();
      }

      // Close inspector or selection: Escape
      if (e.key === 'Escape') {
        closeTaskEditor();
        clearSelection();
      }

      // Focus search: /
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        document.getElementById('global-search-input')?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleDock, clearSelection, closeTaskEditor]);

  return (
    <div
      id="instrument-root-layout"
      className="flex flex-col w-screen h-screen overflow-hidden bg-[var(--color-surface)] text-[var(--color-ink)] font-sans antialiased"
    >
      {/* Top Bar */}
      <TopBar />

      {/* Main Surface Body Row */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Surface Rail */}
        <Rail />

        {/* Central Work Canvas / Active Surface */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          <div className="flex-1 flex overflow-hidden relative">
            {activeSurface === 'map' && <MapSurface />}
            {activeSurface === 'survey' && <SurveySurface />}
            {activeSurface === 'papers' && <PapersSurface />}
            {activeSurface === 'experiments' && <ExperimentsSurface />}
            {activeSurface === 'tasks' && <TasksSurface />}
            {activeSurface === 'runtime' && <RuntimeSurface />}
          </div>

          {/* Bottom Selected-Link Inspector (Opens when a relationship link is selected) */}
          <Inspector />
        </div>

        {/* Right panel: assistant, editors, and settings */}
        <AssistantDock />
      </div>

      {taskEditor && (
        <div
          className="kanban-modal-backdrop"
          onMouseDown={event => {
            if (event.target === event.currentTarget) closeTaskEditor();
          }}
        >
          <div
            className="kanban-modal-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="task-editor-title"
          >
            <div className="kanban-modal-header">
              <h2 id="task-editor-title" className="kanban-modal-heading">
                {taskEditor.taskId ? `Edit ${taskEditor.taskId}` : 'New task'}
              </h2>
              <button
                type="button"
                onClick={closeTaskEditor}
                aria-label="Close task editor"
                className="p-1 rounded text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-paper)]"
              >
                <X size={16} />
              </button>
            </div>
            <TaskEditorPanel />
          </div>
        </div>
      )}
    </div>
  );
};

export default function App() {
  return (
    <WorkspaceProvider>
      <WorkspaceShell />
    </WorkspaceProvider>
  );
}
