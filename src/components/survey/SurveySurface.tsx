import { useEffect, useState } from 'react';
import { AlertCircle, Bot, Compass, GitMerge, RefreshCw } from 'lucide-react';
import { TabHelpTip } from '../common/TabHelpTip';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useLiterature } from '../../context/useLiterature';
import { useScouts } from '../../context/useScouts';
import { activeScoutRun } from '../../scoutClient';
import { DiscoveryView } from './DiscoveryView';
import { SynthesisView } from './SynthesisView';
import './survey.css';

type SurveyView = 'discover' | 'synthesize';

export function SurveySurface() {
  const { setActiveContext, openProblems, candidateQuestions, unclusteredOpenProblemsCount, workspaceDir } = useWorkspace();
  const literature = useLiterature(workspaceDir);
  const scouts = useScouts(workspaceDir);
  const [view, setView] = useState<SurveyView>('discover');
  const [refreshing, setRefreshing] = useState(false);

  const activeProblemsCount = openProblems.filter(problem => !problem.retireReason).length;
  const activeCandidatesCount = candidateQuestions.filter(candidate => !candidate.retireReason).length;
  const promotedCount = candidateQuestions.filter(candidate => Boolean(candidate.promotedQuestionId)).length;
  const inboxCount = literature.results.length;
  const activeJobsCount = literature.snapshot?.jobs.filter(job => job.enabled).length ?? 0;
  const schedulerActive = literature.snapshot?.scheduler.active ?? false;

  const activeScoutRuns = (scouts.snapshot?.runs ?? []).filter(run => activeScoutRun(run.state));
  const hasActiveScout = activeScoutRuns.length > 0;
  const primaryActiveRun = activeScoutRuns[0];

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([literature.refresh(), scouts.refresh()]);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    setActiveContext({
      type: 'survey',
      id: 'literature-survey',
      label: 'Literature Survey',
      secondaryLabel: view === 'discover'
        ? `Paper discovery · ${inboxCount} papers in inbox`
        : `Synthesis · ${activeProblemsCount} problems · ${activeCandidatesCount} candidates`
    });
  }, [setActiveContext, view, inboxCount, activeProblemsCount, activeCandidatesCount]);

  const selectView = (nextView: SurveyView) => {
    setView(nextView);
    document.getElementById(`survey-tab-${nextView}`)?.focus();
  };

  return (
    <section id="survey-surface" className="flex-1 h-full flex flex-col bg-[var(--color-paper)] overflow-hidden survey-surface">
      {/* Top Header matching PapersSurface / PDF Vault design language */}
      <header className="border-b border-[var(--color-rule)] bg-[var(--color-surface)] px-6 py-4 flex flex-col gap-3 shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Title & Amber Icon Badge */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0 shadow-2xs">
              <Compass size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-[var(--color-ink)] leading-none">
                  Literature Survey
                </h1>
                <TabHelpTip
                  title="Literature Research & Synthesis"
                  category="Research Workflow"
                  summary="Bridge literature discovery with argument formulation: search papers, capture concrete limitations, and cluster them into falsifiable research questions."
                  tips={[
                    'Discover: describe a research problem, then inspect the generated search strategy.',
                    'Capture: save papers or extract source-grounded observations into Synthesis.',
                    'Synthesize: link observations to candidate questions with an explicit relevance reason.',
                    'Promote: move a falsifiable candidate question into the Research Map.'
                  ]}
                  placement="bottom"
                  variant="inline"
                  color="amber"
                />
              </div>
              <p className="text-xs text-[var(--color-ink-muted)] mt-1">
                Turn a research intent into a traceable paper set, then into testable questions.
              </p>
            </div>
          </div>

          {/* Right Status & Actions */}
          <div className="flex items-center gap-3 flex-wrap">
            <div
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs transition-colors ${
                hasActiveScout
                  ? 'border-amber-400 dark:border-amber-600 bg-amber-100/80 dark:bg-amber-950/70 text-amber-950 dark:text-amber-200 shadow-2xs'
                  : 'border-amber-200/80 dark:border-amber-800/60 bg-amber-50/70 dark:bg-amber-950/40 text-[var(--color-ink-muted)]'
              }`}
              aria-label="Literature agent architecture"
            >
              <Bot size={13} className="text-amber-600 dark:text-amber-400 shrink-0" />
              <strong className="font-semibold text-[var(--color-ink)] text-xs">Paper Scout</strong>
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${hasActiveScout ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
              <span className="font-mono text-[11px]">
                {hasActiveScout
                  ? `${primaryActiveRun.activeStage || primaryActiveRun.state} (${primaryActiveRun.counters.screened} screened)`
                  : activeJobsCount > 0 ? `${activeJobsCount} active` : 'idle'}
              </span>
              <span className="text-[var(--color-rule)]">|</span>
              <span className="font-mono text-[11px]">
                scheduler {schedulerActive ? 'online' : 'offline'}
              </span>
            </div>

            <button
              type="button"
              disabled={refreshing}
              onClick={handleRefresh}
              className="px-3 py-1.5 bg-[var(--color-paper)] hover:bg-[var(--color-surface)] text-[var(--color-ink)] rounded-lg text-xs font-medium border border-[var(--color-rule)] hover:border-amber-400 dark:hover:border-amber-600 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Sync discovery results from disk"
            >
              <RefreshCw size={12} className={refreshing ? 'animate-spin text-amber-500' : ''} />
              <span>Sync</span>
            </button>
          </div>
        </div>

        {/* Sub-navigation Tab Bar styled like PapersSurface with Amber theme */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-rule)] pt-3">
          <nav className="flex items-center gap-2 overflow-x-auto scrollbar-none" role="tablist" aria-label="Literature Survey views">
            <button
              id="survey-tab-discover"
              role="tab"
              aria-selected={view === 'discover'}
              aria-controls="survey-panel-discover"
              tabIndex={view === 'discover' ? 0 : -1}
              onClick={() => setView('discover')}
              onKeyDown={event => {
                if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
                  event.preventDefault();
                  selectView('synthesize');
                }
              }}
              className={`px-3 py-1.5 text-xs font-mono rounded-lg flex items-center gap-2 transition-all shrink-0 border cursor-pointer ${
                view === 'discover'
                  ? 'bg-amber-600 dark:bg-amber-500 text-white font-semibold border-amber-600 dark:border-amber-500 shadow-2xs'
                  : 'bg-[var(--color-paper)] text-[var(--color-ink-muted)] border-[var(--color-rule)] hover:text-[var(--color-ink)] hover:border-amber-400 dark:hover:border-amber-600'
              }`}
            >
              <Compass size={13} aria-hidden="true" />
              <span>Discover</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                view === 'discover'
                  ? 'bg-amber-700/80 dark:bg-amber-600/80 text-white'
                  : 'bg-[var(--color-surface)] text-[var(--color-ink-muted)] border border-[var(--color-rule)]'
              }`}>
                {inboxCount}
              </span>
            </button>

            <button
              id="survey-tab-synthesize"
              role="tab"
              aria-selected={view === 'synthesize'}
              aria-controls="survey-panel-synthesize"
              tabIndex={view === 'synthesize' ? 0 : -1}
              onClick={() => setView('synthesize')}
              onKeyDown={event => {
                if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
                  event.preventDefault();
                  selectView('discover');
                }
              }}
              className={`px-3 py-1.5 text-xs font-mono rounded-lg flex items-center gap-2 transition-all shrink-0 border cursor-pointer ${
                view === 'synthesize'
                  ? 'bg-amber-600 dark:bg-amber-500 text-white font-semibold border-amber-600 dark:border-amber-500 shadow-2xs'
                  : 'bg-[var(--color-paper)] text-[var(--color-ink-muted)] border-[var(--color-rule)] hover:text-[var(--color-ink)] hover:border-amber-400 dark:hover:border-amber-600'
              }`}
            >
              <GitMerge size={13} aria-hidden="true" />
              <span>Synthesize</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                view === 'synthesize'
                  ? 'bg-amber-700/80 dark:bg-amber-600/80 text-white'
                  : 'bg-[var(--color-surface)] text-[var(--color-ink-muted)] border border-[var(--color-rule)]'
              }`}>
                {activeProblemsCount}
              </span>
            </button>
          </nav>

          {/* Right Stats & Warning */}
          <div className="flex items-center gap-3 text-xs text-[var(--color-ink-muted)]">
            {unclusteredOpenProblemsCount >= 15 && (
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 shadow-2xs"
                title={`${unclusteredOpenProblemsCount} observations are not linked to candidate questions.`}
              >
                <AlertCircle size={12} aria-hidden="true" className="text-amber-600 dark:text-amber-400" />
                <span>{unclusteredOpenProblemsCount} unclustered</span>
              </span>
            )}
            <span className="font-mono text-[11px]">
              <strong className="font-semibold text-[var(--color-ink)]">{activeCandidatesCount}</strong> candidates
            </span>
            <span className="text-[var(--color-rule)]">·</span>
            <span className="font-mono text-[11px]">
              <strong className="font-semibold text-[var(--color-ink)]">{promotedCount}</strong> promoted
            </span>
          </div>
        </div>
      </header>

      {/* Main Content Pane */}
      <div
        className="flex-1 overflow-y-auto bg-[var(--color-surface)]"
        role="tabpanel"
        id={`survey-panel-${view}`}
        aria-labelledby={`survey-tab-${view}`}
      >
        {view === 'discover' ? <DiscoveryView /> : <SynthesisView />}
      </div>
    </section>
  );
}
