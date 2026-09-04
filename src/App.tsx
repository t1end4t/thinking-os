import React, { useEffect } from 'react';
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

const WorkspaceShell: React.FC = () => {
  const {
    activeSurface,
    selectedLinkId,
    setSelectedLinkId,
    clearSelection,
    toggleDock
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
  }, [toggleDock, clearSelection]);

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
