import { useEffect, useState } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useLiterature } from '../../context/useLiterature';
import { SynthesisView } from './SynthesisView';
import { DiscoveryView } from './DiscoveryView';
import { TabHelpTip } from '../common/TabHelpTip';
import { Compass, GitMerge, AlertCircle, CheckCircle2, Bookmark, HelpCircle } from 'lucide-react';
import './survey.css';

export function SurveySurface() {
  const { setActiveContext, openProblems, candidateQuestions, unclusteredOpenProblemsCount, workspaceDir } = useWorkspace();
  const literature = useLiterature(workspaceDir);
  const [view, setView] = useState<'discover' | 'synthesize'>('discover');

  const activeProblemsCount = openProblems.filter(p => !p.retireReason).length;
  const activeCandidatesCount = candidateQuestions.filter(c => !c.retireReason).length;
  const promotedCount = candidateQuestions.filter(c => Boolean(c.promotedQuestionId)).length;
  const inboxCount = literature.results.length;

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

  return (
    <section id="survey-surface" className="survey-surface">
      {/* Surface Header */}
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--color-rule)] bg-[var(--color-surface)] px-6 py-3.5 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-indigo-300 bg-indigo-50 text-indigo-600 dark:border-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-400 shadow-2xs">
            <Compass size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold tracking-tight text-[var(--color-ink)]">
                Literature Survey
              </h1>
              <TabHelpTip
                title="Literature Research & Synthesis"
                category="Research Workflow"
                summary="Bridge literature discovery with argument formulation: search papers, capture concrete limitations, and cluster them into falsifiable research questions."
                tips={[
                  "Discover: Formulate a research brief and queries to find literature from arXiv and OpenAlex.",
                  "Capture: Highlight paper limitations in the Paper Reader or record cross-paper observations manually.",
                  "Synthesize: Drag & drop problems onto candidate questions to establish traceable relevance links.",
                  "Promote: When a candidate question meets falsifiability standards, graduate it directly into your Research Graph."
                ]}
                placement="bottom"
                variant="inline"
              />
            </div>
            <p className="hidden text-[0.6875rem] text-[var(--color-ink-muted)] sm:block">
              Discover (Inbox) → Capture (Observations) → Synthesize (Questions) → Promote (Research Map)
            </p>
          </div>
        </div>

        {/* Live Status Indicators */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {unclusteredOpenProblemsCount >= 15 && (
            <div
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1 font-mono text-[0.6875rem] font-bold text-amber-800 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
              title={`${unclusteredOpenProblemsCount} problems have not yet been clustered into candidate questions.`}
            >
              <AlertCircle size={12} className="text-amber-600 dark:text-amber-400" />
              <span>{unclusteredOpenProblemsCount} unclustered problems</span>
            </div>
          )}

          <div className="hidden items-center gap-2 md:flex">
            <span className="rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper)] px-2.5 py-1 font-mono text-[0.6875rem] text-[var(--color-ink)]">
              <span className="text-[var(--color-ink-muted)]">Observations: </span>
              <strong>{activeProblemsCount}</strong> active
            </span>
            <span className="rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper)] px-2.5 py-1 font-mono text-[0.6875rem] text-[var(--color-ink)]">
              <span className="text-[var(--color-ink-muted)]">Candidates: </span>
              <strong>{activeCandidatesCount}</strong>
              {promotedCount > 0 && <span className="text-[var(--color-holds)] ml-1">({promotedCount} promoted)</span>}
            </span>
          </div>

          {/* Segmented Tab Navigation */}
          <div
            className="flex items-center gap-1 p-0.5 rounded-xl border border-[var(--color-rule)] bg-[var(--color-paper)]"
            role="tablist"
            aria-label="Literature Survey views"
          >
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
                  setView('synthesize');
                  document.getElementById('survey-tab-synthesize')?.focus();
                }
              }}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                view === 'discover'
                  ? 'bg-[var(--color-surface)] text-[var(--accent-indigo)] font-semibold shadow-2xs border border-[var(--color-rule)]'
                  : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
              }`}
            >
              <Compass size={14} className={view === 'discover' ? 'text-[var(--accent-indigo)]' : ''} />
              <span>Discover</span>
              {inboxCount > 0 && (
                <span className="ml-0.5 px-1.5 py-0.2 rounded-full font-mono text-[0.625rem] bg-[var(--color-rule)] text-[var(--color-ink)]">
                  {inboxCount}
                </span>
              )}
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
                  setView('discover');
                  document.getElementById('survey-tab-discover')?.focus();
                }
              }}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                view === 'synthesize'
                  ? 'bg-[var(--color-surface)] text-[var(--accent-indigo)] font-semibold shadow-2xs border border-[var(--color-rule)]'
                  : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
              }`}
            >
              <GitMerge size={14} className={view === 'synthesize' ? 'text-[var(--accent-indigo)]' : ''} />
              <span>Synthesize</span>
              {activeProblemsCount > 0 && (
                <span className="ml-0.5 px-1.5 py-0.2 rounded-full font-mono text-[0.625rem] bg-[var(--color-rule)] text-[var(--color-ink)]">
                  {activeProblemsCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div
        className="survey-scroll"
        role="tabpanel"
        id={`survey-panel-${view}`}
        aria-labelledby={`survey-tab-${view}`}
      >
        {view === 'discover' ? <DiscoveryView /> : <SynthesisView />}
      </div>
    </section>
  );
}
