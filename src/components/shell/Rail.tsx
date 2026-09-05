import React from 'react';
import {
  GitFork,
  Compass,
  BookOpen,
  FileText,
  FlaskConical,
  ListChecks,
  Cpu
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { SurfaceId } from '../../types';

interface SurfaceItem {
  id: SurfaceId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  activeColor: string;
  accentBar: string;
}

const RESEARCH_SURFACES: SurfaceItem[] = [
  {
    id: 'map',
    label: 'Map',
    icon: GitFork,
    description: 'Argument tree and structural links',
    activeColor: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 ring-1 ring-indigo-200/80 dark:ring-indigo-800/60 shadow-xs shadow-indigo-500/10',
    accentBar: 'bg-indigo-600 dark:bg-indigo-400'
  },
  {
    id: 'survey',
    label: 'Survey',
    icon: Compass,
    description: 'Open-problem notes and candidate clusters',
    activeColor: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 ring-1 ring-amber-200/80 dark:ring-amber-800/60 shadow-xs shadow-amber-500/10',
    accentBar: 'bg-amber-500 dark:bg-amber-400'
  },
  {
    id: 'papers',
    label: 'Papers',
    icon: FileText,
    description: 'Reader and evidence capture',
    activeColor: 'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60 ring-1 ring-teal-200/80 dark:ring-teal-800/60 shadow-xs shadow-teal-500/10',
    accentBar: 'bg-teal-500 dark:bg-teal-400'
  },
  {
    id: 'experiments',
    label: 'Experiments',
    icon: FlaskConical,
    description: 'Claim-centric artifact gallery',
    activeColor: 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/60 ring-1 ring-sky-200/80 dark:ring-sky-800/60 shadow-xs shadow-sky-500/10',
    accentBar: 'bg-sky-500 dark:bg-sky-400'
  }
];

const PRIMARY_SURFACES: SurfaceItem[] = [
  {
    id: 'tasks',
    label: 'Tasks',
    icon: ListChecks,
    description: 'Work queue and delivery pipeline',
    activeColor: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 ring-1 ring-rose-200/80 dark:ring-rose-800/60 shadow-xs shadow-rose-500/10',
    accentBar: 'bg-rose-500 dark:bg-rose-400'
  },
  {
    id: 'runtime',
    label: 'Runtime',
    icon: Cpu,
    description: 'Services, runs, models, and targets',
    activeColor: 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/60 ring-1 ring-violet-200/80 dark:ring-violet-800/60 shadow-xs shadow-violet-500/10',
    accentBar: 'bg-violet-500 dark:bg-violet-400'
  }
];

const RESEARCH_SURFACE_IDS = new Set<SurfaceId>(RESEARCH_SURFACES.map(surface => surface.id));

export const Rail: React.FC = () => {
  const { activeSurface, setActiveSurface, setActiveContext } = useWorkspace();
  const isResearchActive = RESEARCH_SURFACE_IDS.has(activeSurface);

  const handleSelectSurface = (surfaceId: SurfaceId) => {
    setActiveSurface(surfaceId);
    if (surfaceId === 'survey') {
      setActiveContext({
        type: 'survey',
        id: 'survey-field',
        label: 'Survey Field',
        secondaryLabel: 'Open problems and candidate clusters'
      });
    } else if (surfaceId === 'map') {
      setActiveContext({
        type: 'graph',
        id: 'global-graph',
        label: 'Global Graph',
        secondaryLabel: 'Argument tree'
      });
    } else if (surfaceId === 'tasks') {
      setActiveContext({
        type: 'task',
        id: 'task-pipeline',
        label: 'Task pipeline',
        secondaryLabel: 'Backlog through verified completion'
      });
    } else if (surfaceId === 'runtime') {
      setActiveContext({
        type: 'service',
        id: 'runtime',
        label: 'Runtime',
        secondaryLabel: 'Services, runs, models, automations, and targets'
      });
    }
  };

  return (
    <aside
      id="instrument-rail"
      className="w-14 border-r border-[var(--color-rule)] bg-[var(--color-surface)] flex flex-col items-center py-4 justify-between shrink-0 select-none z-10"
    >
      <div className="flex flex-col items-center gap-2.5 w-full px-2">
        {PRIMARY_SURFACES.map(surface => {
          const Icon = surface.icon;
          const isActive = activeSurface === surface.id;
          return (
            <button
              key={surface.id}
              id={`rail-btn-${surface.id}`}
              onClick={() => handleSelectSurface(surface.id)}
              title={`${surface.label} — ${surface.description}`}
              className={`relative w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-200 group ${
                isActive
                  ? `${surface.activeColor} scale-100 font-semibold`
                  : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              {isActive && (
                <div className={`absolute -left-[9px] top-2 bottom-2 w-1 rounded-r-full ${surface.accentBar}`} />
              )}
              <Icon className="w-4 h-4" />
              <span className="sr-only">{surface.label}</span>
            </button>
          );
        })}

        <button
          id="rail-btn-research"
          onClick={() => handleSelectSurface('map')}
          title="Research — Map, survey, papers, and experiments"
          className={`relative w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-200 group ${
            isResearchActive
              ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 ring-1 ring-indigo-200/80 dark:ring-indigo-800/60 shadow-xs shadow-indigo-500/10'
              : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
          }`}
        >
          {isResearchActive && <div className="absolute -left-[9px] top-2 bottom-2 w-1 rounded-r-full bg-indigo-600 dark:bg-indigo-400" />}
          <BookOpen className="w-4 h-4" />
          <span className="sr-only">Research</span>
        </button>

        <div className="relative flex flex-col items-center gap-1.5 pt-0.5 pl-2">
          <div className="absolute left-0 top-0 bottom-4 w-px bg-[var(--color-rule)]" />
          {RESEARCH_SURFACES.map(surface => {
            const Icon = surface.icon;
            const isActive = activeSurface === surface.id;
            return (
              <button
                key={surface.id}
                id={`rail-btn-${surface.id}`}
                onClick={() => handleSelectSurface(surface.id)}
                title={`Research / ${surface.label} — ${surface.description}`}
                className={`relative w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-200 ${
                  isActive
                    ? surface.activeColor
                    : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                <div className="absolute -left-2 w-2 h-px bg-[var(--color-rule)]" />
                <Icon className="w-3.5 h-3.5" />
                <span className="sr-only">Research / {surface.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col items-center pb-2 text-[0.7188rem] font-mono text-[var(--color-ink-muted)] opacity-60 pointer-events-none">
        v0.1
      </div>
    </aside>
  );
};
