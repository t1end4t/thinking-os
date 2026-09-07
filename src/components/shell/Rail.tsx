import React, { useState, useEffect } from 'react';
import {
  GitFork,
  Compass,
  BookOpen,
  FileText,
  FlaskConical,
  ScrollText,
  ListChecks,
  Cpu,
  GraduationCap,
  ChevronDown,
  ChevronRight,
  Lightbulb,
  Sliders,
  BookmarkCheck,
  Share2
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { SurfaceId } from '../../types';
import { LearnViewMode } from '../../learnTypes';

interface SurfaceItem {
  id: SurfaceId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  category: string;
  tips: string[];
  shortcut?: string;
  activeColor: string;
  accentBar: string;
}

const RESEARCH_SURFACES: SurfaceItem[] = [
  {
    id: 'map',
    label: 'Argument Map',
    icon: GitFork,
    description: 'Topological tree organizing Questions, Claims, and Evidence relationships.',
    category: 'Epistemic Graph',
    tips: [
      'Pan the canvas by dragging; scroll wheel to zoom (70% - 150%).',
      'Click any Question, Claim, or Evidence node to focus its dependency branch.',
      'Drag edges or nodes into the Assistant Dock to link evidence to claims.',
      'Filter link status chips (All, Holds, Weak, Missing) to detect reasoning flaws.'
    ],
    shortcut: 'Research 1',
    activeColor: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 ring-1 ring-indigo-200/80 dark:ring-indigo-800/60 shadow-xs shadow-indigo-500/10',
    accentBar: 'bg-indigo-600 dark:bg-indigo-400'
  },
  {
    id: 'survey',
    label: 'Survey',
    icon: Compass,
    description: 'Literature scouting, candidate research questions, and cluster formation.',
    category: 'Literature Scouting',
    tips: [
      'Add unclustered open problem notes from background reading.',
      'Cluster convergent notes into Candidate Research Questions.',
      'Promote qualified candidates into formal Argument Map Claims (Gate 5 check).',
      'Watch for the 15-note stop condition warning to avoid aimless reading.'
    ],
    shortcut: 'Research 2',
    activeColor: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 ring-1 ring-amber-200/80 dark:ring-amber-800/60 shadow-xs shadow-amber-500/10',
    accentBar: 'bg-amber-500 dark:bg-amber-400'
  },
  {
    id: 'papers',
    label: 'Papers',
    icon: FileText,
    description: 'Literature reader and inline evidence extraction.',
    category: 'Literature Reader',
    tips: [
      'Click paper tabs along the top bar to switch reading material.',
      'Highlight any passage with your mouse to trigger the Evidence Extractor.',
      'Link extracted quotes directly to a claim with your committed rationale.',
      'Send citations and quotes to the Assistant for methodological inquiry.'
    ],
    shortcut: 'Research 3',
    activeColor: 'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60 ring-1 ring-teal-200/80 dark:ring-teal-800/60 shadow-xs shadow-teal-500/10',
    accentBar: 'bg-teal-500 dark:bg-teal-400'
  },
  {
    id: 'experiments',
    label: 'Experiments',
    icon: FlaskConical,
    description: 'Interactive telemetry, benchmark charts, and claim-centric evidence gallery.',
    category: 'Empirical Telemetry',
    tips: [
      'Filter experiment runs by claim or verification status.',
      'Hover over interactive charts to inspect raw numerical measurements.',
      'Drag artifact cards into the Manuscript Locker to embed figures or code.',
      'Copy shell command to reproduce runs locally.'
    ],
    shortcut: 'Research 4',
    activeColor: 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/60 ring-1 ring-sky-200/80 dark:ring-sky-800/60 shadow-xs shadow-sky-500/10',
    accentBar: 'bg-sky-500 dark:bg-sky-400'
  },
  {
    id: 'manuscript',
    label: 'Manuscript',
    icon: ScrollText,
    description: 'Academic paper drafting, synthesis locker, and argumentation storyboard.',
    category: 'Academic Synthesis',
    tips: [
      'Toggle between Composer, Argument Storyboard, and Preprint Reader views.',
      'In Composer: write LaTeX-ready Markdown and set per-section Narrative Goals.',
      'In Synthesis Locker: drag & drop verified claims and citations directly into text.',
      'In Preprint Reader: preview publication layout and export formatted PDF.'
    ],
    shortcut: 'Research 5',
    activeColor: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 ring-1 ring-purple-200/80 dark:ring-purple-800/60 shadow-xs shadow-purple-500/10',
    accentBar: 'bg-purple-600 dark:bg-purple-400'
  }
];

interface LearnSubTabItem {
  id: LearnViewMode;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  activeColor: string;
}

const LEARN_SUB_TABS: LearnSubTabItem[] = [
  {
    id: 'desk',
    label: 'Desk',
    icon: BookOpen,
    description: 'Reading desk with 6-level Bloom rigor & integrated scratchpad',
    activeColor: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 ring-1 ring-emerald-200/80 dark:ring-emerald-800/60 shadow-xs'
  },
  {
    id: 'roadmap',
    label: 'Shelf',
    icon: Compass,
    description: 'Textbook tracks, chapter progress & curriculum matrix',
    activeColor: 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/60 ring-1 ring-sky-200/80 dark:ring-sky-800/60 shadow-xs'
  },
  {
    id: 'graph',
    label: 'Graph',
    icon: Share2,
    description: 'Obsidian-style mathematical concept dependency graph',
    activeColor: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 ring-1 ring-indigo-200/80 dark:ring-indigo-800/60 shadow-xs'
  }
];

const PRIMARY_SURFACES: SurfaceItem[] = [
  {
    id: 'tasks',
    label: 'Tasks',
    icon: ListChecks,
    description: 'Work queue and Kanban delivery pipeline.',
    category: 'Delivery Pipeline',
    tips: [
      'Click tab to open the full Kanban board.',
      'Drag task cards across Backlog, In Progress, Review, and Done.',
      'Click any card to inspect details, set priority, or link research Claims.',
      'Drag task cards into the Assistant Dock to reference them in conversation.'
    ],
    shortcut: 'Primary 1',
    activeColor: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 ring-1 ring-rose-200/80 dark:ring-rose-800/60 shadow-xs shadow-rose-500/10',
    accentBar: 'bg-rose-500 dark:bg-rose-400'
  },
  {
    id: 'runtime',
    label: 'Runtime',
    icon: Cpu,
    description: 'Execution layer for services, models, and agent jobs.',
    category: 'Execution Layer',
    tips: [
      'Click tab to inspect services, models, and agent jobs.',
      'Use sub-tabs to switch between Services, LLM Models, and Agent Jobs.',
      'Drag any service or model card into the chat dock to inspect it.'
    ],
    shortcut: 'Primary 2',
    activeColor: 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/60 ring-1 ring-violet-200/80 dark:ring-violet-800/60 shadow-xs shadow-violet-500/10',
    accentBar: 'bg-violet-500 dark:bg-violet-400'
  }
];

const RESEARCH_SURFACE_IDS = new Set<SurfaceId>(RESEARCH_SURFACES.map(surface => surface.id));

export const Rail: React.FC = () => {
  const {
    activeSurface,
    setActiveSurface,
    setActiveContext,
    activeLearnTab,
    setActiveLearnTab
  } = useWorkspace();
  const isResearchActive = RESEARCH_SURFACE_IDS.has(activeSurface);
  const [isResearchExpanded, setIsResearchExpanded] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('thinking_os_rail_research_expanded');
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });
  const [lastResearchSurface, setLastResearchSurface] = useState<SurfaceId>('map');

  const isLearnActive = activeSurface === 'learn';
  const [isLearnExpanded, setIsLearnExpanded] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('thinking_os_rail_learn_expanded');
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });

  // Persist toggle states so user choices stick across reloads
  useEffect(() => {
    try {
      localStorage.setItem('thinking_os_rail_research_expanded', JSON.stringify(isResearchExpanded));
    } catch {}
  }, [isResearchExpanded]);

  useEffect(() => {
    try {
      localStorage.setItem('thinking_os_rail_learn_expanded', JSON.stringify(isLearnExpanded));
    } catch {}
  }, [isLearnExpanded]);

  // Track the most recently visited research surface without overriding user toggle preference
  useEffect(() => {
    if (RESEARCH_SURFACE_IDS.has(activeSurface)) {
      setLastResearchSurface(activeSurface);
    }
  }, [activeSurface]);

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
    } else if (surfaceId === 'papers') {
      setActiveContext({
        type: 'passage',
        id: 'papers-field',
        label: 'Literature Papers',
        secondaryLabel: 'Reading and inline evidence extraction'
      });
    } else if (surfaceId === 'experiments') {
      setActiveContext({
        type: 'artifact',
        id: 'experiments-field',
        label: 'Experiments Field',
        secondaryLabel: 'Telemetry and empirical verification'
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
    } else if (surfaceId === 'manuscript') {
      setActiveContext({
        type: 'manuscript',
        id: 'manuscript-draft',
        label: 'Manuscript Draft',
        secondaryLabel: 'Academic paper synthesis & argumentation'
      });
    } else if (surfaceId === 'learn') {
      setActiveContext({
        type: 'learn',
        id: 'cognitive-learning',
        label: 'Learning & Mathematics',
        secondaryLabel: 'Curriculum tracks, theory, labs, and research synthesis'
      });
    }
  };

  const handleToggleResearch = () => {
    setIsResearchExpanded(prev => !prev);
    if (!isResearchActive) {
      handleSelectSurface(lastResearchSurface);
    }
  };

  const handleToggleLearn = () => {
    setIsLearnExpanded(prev => !prev);
    if (!isLearnActive) {
      handleSelectSurface('learn');
    }
  };

  const handleSelectLearnSubTab = (tabId: LearnViewMode) => {
    setActiveSurface('learn');
    setActiveLearnTab(tabId);
    setActiveContext({
      type: 'learn',
      id: `learn-${tabId}`,
      label: `Learn / ${tabId.charAt(0).toUpperCase() + tabId.slice(1)}`,
      secondaryLabel: 'Mathematical research curriculum'
    });
  };

  return (
    <aside
      id="instrument-rail"
      className="w-16 border-r border-[var(--color-rule)] bg-[var(--color-surface)] flex flex-col items-center py-4 justify-between shrink-0 select-none z-10"
    >
      <div className="flex flex-col items-center gap-2.5 w-full px-2">
        {/* Primary Operational Surfaces */}
        {PRIMARY_SURFACES.map(surface => {
          const Icon = surface.icon;
          const isActive = activeSurface === surface.id;
          return (
            <button
              key={surface.id}
              id={`rail-btn-${surface.id}`}
              type="button"
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

        {/* Research Suite Parent Group - framed box */}
        <div className="relative flex flex-col items-center w-full p-1 rounded-2xl border border-[var(--color-rule)] bg-[var(--color-paper)]/40 shadow-2xs">
          <div className="relative w-10 h-10 flex items-center justify-center">
            <button
              id="rail-btn-research"
              type="button"
              onClick={handleToggleResearch}
              title={`Research Workspace — ${isResearchExpanded ? 'Click to collapse sub-tabs' : 'Click to expand sub-tabs'}`}
              className={`relative w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-200 group ${
                isResearchActive
                  ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 ring-1 ring-indigo-200/80 dark:ring-indigo-800/60 shadow-xs shadow-indigo-500/10'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              {isResearchActive && (
                <div className="absolute -left-[5px] top-2 bottom-2 w-1 rounded-r-full bg-indigo-600 dark:bg-indigo-400" />
              )}
              <BookOpen className="w-4 h-4" />
              <span className="sr-only">Research</span>
            </button>

            {/* Subtle collapse / expand chevron indicator button */}
            <button
              type="button"
              id="rail-toggle-research"
              onClick={(e) => {
                e.stopPropagation();
                setIsResearchExpanded(prev => !prev);
              }}
              title={isResearchExpanded ? 'Click to collapse sub-tabs' : 'Click to expand sub-tabs'}
              aria-label={isResearchExpanded ? 'Collapse Research sub-tabs' : 'Expand Research sub-tabs'}
              className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-[var(--color-surface)] border border-[var(--color-rule)] flex items-center justify-center text-[var(--color-ink-muted)] hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-300 dark:hover:border-indigo-600 shadow-2xs transition-all z-10 cursor-pointer"
            >
              {isResearchExpanded ? (
                <ChevronDown className="w-2.5 h-2.5 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-transform" />
              ) : (
                <ChevronRight className="w-2.5 h-2.5 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-transform" />
              )}
            </button>
          </div>

          {/* Indented Research Sub-Surfaces */}
          {isResearchExpanded && (
            <div
              id="rail-research-subsurfaces"
              className="relative flex flex-col items-center w-full pt-1.5 pb-0.5 gap-1.5 animate-fadeIn"
            >
              {RESEARCH_SURFACES.map(surface => {
                const Icon = surface.icon;
                const isActive = activeSurface === surface.id;
                return (
                  <button
                    key={surface.id}
                    id={`rail-btn-${surface.id}`}
                    type="button"
                    onClick={() => handleSelectSurface(surface.id)}
                    title={`Research / ${surface.label} — ${surface.description}`}
                    className={`relative w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-150 group ${
                      isActive
                        ? `${surface.activeColor} scale-100 font-medium`
                        : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span className="sr-only">Research / {surface.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Learn Suite Parent Group - framed box just like Research */}
        <div className="relative flex flex-col items-center w-full p-1 rounded-2xl border border-[var(--color-rule)] bg-[var(--color-paper)]/40 shadow-2xs">
          <div className="relative w-10 h-10 flex items-center justify-center">
            <button
              id="rail-btn-learn"
              type="button"
              onClick={handleToggleLearn}
              title={`Learn & Curriculum — ${isLearnExpanded ? 'Click to collapse sub-tabs' : 'Click to expand sub-tabs'}`}
              className={`relative w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-200 group ${
                isLearnActive
                  ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 ring-1 ring-emerald-200/80 dark:ring-emerald-800/60 shadow-xs shadow-emerald-500/10'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              {isLearnActive && (
                <div className="absolute -left-[5px] top-2 bottom-2 w-1 rounded-r-full bg-emerald-600 dark:bg-emerald-400" />
              )}
              <GraduationCap className="w-4 h-4" />
              <span className="sr-only">Learn</span>
            </button>

            {/* Subtle collapse / expand chevron indicator button */}
            <button
              type="button"
              id="rail-toggle-learn"
              onClick={(e) => {
                e.stopPropagation();
                setIsLearnExpanded(prev => !prev);
              }}
              title={isLearnExpanded ? 'Click to collapse sub-tabs' : 'Click to expand sub-tabs'}
              aria-label={isLearnExpanded ? 'Collapse Learn sub-tabs' : 'Expand Learn sub-tabs'}
              className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-[var(--color-surface)] border border-[var(--color-rule)] flex items-center justify-center text-[var(--color-ink-muted)] hover:text-emerald-600 dark:hover:text-emerald-400 hover:border-emerald-300 dark:hover:border-emerald-600 shadow-2xs transition-all z-10 cursor-pointer"
            >
              {isLearnExpanded ? (
                <ChevronDown className="w-2.5 h-2.5 text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-transform" />
              ) : (
                <ChevronRight className="w-2.5 h-2.5 text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-transform" />
              )}
            </button>
          </div>

          {/* Indented Learn Sub-Tabs */}
          {isLearnExpanded && (
            <div
              id="rail-learn-subsurfaces"
              className="relative flex flex-col items-center w-full pt-1.5 pb-0.5 gap-1.5 animate-fadeIn"
            >
              {LEARN_SUB_TABS.map(tab => {
                const Icon = tab.icon;
                const isActive = isLearnActive && activeLearnTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    id={`rail-btn-learn-${tab.id}`}
                    type="button"
                    onClick={() => handleSelectLearnSubTab(tab.id)}
                    title={`Learn / ${tab.label} — ${tab.description}`}
                    className={`relative w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-150 group ${
                      isActive
                        ? `${tab.activeColor} scale-100 font-medium`
                        : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span className="sr-only">Learn / {tab.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col items-center pb-2 text-[0.7188rem] font-mono text-[var(--color-ink-muted)] opacity-60 pointer-events-none">
        v0.1
      </div>
    </aside>
  );
};
