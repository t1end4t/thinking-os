import { useEffect, useState } from 'react';
import { AlertCircle, Bot, Compass, GitMerge } from 'lucide-react';
import { TabHelpTip } from '../common/TabHelpTip';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useLiterature } from '../../context/useLiterature';
import { DiscoveryView } from './DiscoveryView';
import { SynthesisView } from './SynthesisView';
import './survey.css';

type SurveyView = 'discover' | 'synthesize';

export function SurveySurface() {
  const { setActiveContext, openProblems, candidateQuestions, unclusteredOpenProblemsCount, workspaceDir } = useWorkspace();
  const literature = useLiterature(workspaceDir);
  const [view, setView] = useState<SurveyView>('discover');

  const activeProblemsCount = openProblems.filter(problem => !problem.retireReason).length;
  const activeCandidatesCount = candidateQuestions.filter(candidate => !candidate.retireReason).length;
  const promotedCount = candidateQuestions.filter(candidate => Boolean(candidate.promotedQuestionId)).length;
  const inboxCount = literature.results.length;
  const activeJobsCount = literature.snapshot?.jobs.filter(job => job.enabled).length ?? 0;
  const schedulerActive = literature.snapshot?.scheduler.active ?? false;

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
    <section id="survey-surface" className="survey-surface">
      <header className="survey-command-header">
        <div className="survey-command-main">
          <div className="survey-command-title">
            <div className="survey-command-heading">
              <Compass size={18} aria-hidden="true" />
              <h1>Literature Survey</h1>
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
              />
            </div>
            <p>Turn a research intent into a traceable paper set, then into testable questions.</p>
          </div>

          <div className="survey-agent-line" aria-label="Literature agent architecture">
            <Bot size={13} aria-hidden="true" />
            <strong>Paper Scout</strong>
            <span>planned</span>
            <span>{activeJobsCount} active job{activeJobsCount === 1 ? '' : 's'}</span>
            <span>scheduler {schedulerActive ? 'online' : 'offline'}</span>
            <span>managed in Runtime / Agent Jobs</span>
          </div>
        </div>

        <div className="survey-command-bar">
          <nav className="survey-view-tabs" role="tablist" aria-label="Literature Survey views">
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
            >
              <Compass size={13} aria-hidden="true" />
              <span>Discover</span>
              <strong>{inboxCount}</strong>
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
            >
              <GitMerge size={13} aria-hidden="true" />
              <span>Synthesize</span>
              <strong>{activeProblemsCount}</strong>
            </button>
          </nav>

          <div className="survey-command-stats">
            {unclusteredOpenProblemsCount >= 15 && (
              <span className="survey-command-warning" title={`${unclusteredOpenProblemsCount} observations are not linked to candidate questions.`}>
                <AlertCircle size={12} aria-hidden="true" />{unclusteredOpenProblemsCount} unclustered
              </span>
            )}
            <span><strong>{activeCandidatesCount}</strong> candidates</span>
            <span><strong>{promotedCount}</strong> promoted</span>
          </div>
        </div>
      </header>

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
