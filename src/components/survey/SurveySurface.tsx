import { useEffect, useState } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { SynthesisView } from './SynthesisView';
import { DiscoveryView } from './DiscoveryView';
import './survey.css';

export function SurveySurface() {
  const { setActiveContext } = useWorkspace();
  const [view, setView] = useState<'discover' | 'synthesize'>('discover');
  useEffect(() => {
    setActiveContext({ type: 'survey', id: 'literature-survey', label: 'Literature Survey', secondaryLabel: view === 'discover' ? 'Paper discovery' : 'Problems and candidate questions' });
  }, [setActiveContext, view]);
  return <section id="survey-surface" className="survey-surface">
    <header className="survey-header">
      <div><h1>Literature Survey</h1><p>Discover papers. Connect observations. Shape research questions.</p></div>
      <div className="survey-tabs" role="tablist" aria-label="Literature Survey views">
        {(['discover', 'synthesize'] as const).map(value => <button key={value} id={`survey-tab-${value}`} role="tab" aria-selected={view === value} aria-controls={`survey-panel-${value}`} tabIndex={view === value ? 0 : -1}
          onClick={() => setView(value)} onKeyDown={event => {
            if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
              event.preventDefault();
              const next = event.key === 'Home' ? 'discover' : event.key === 'End' ? 'synthesize' : view === 'discover' ? 'synthesize' : 'discover';
              setView(next); document.getElementById(`survey-tab-${next}`)?.focus();
            }
          }}>{value === 'discover' ? 'Discover' : 'Synthesize'}</button>)}
      </div>
    </header>
    <div className="survey-scroll" role="tabpanel" id={`survey-panel-${view}`} aria-labelledby={`survey-tab-${view}`}>
      {view === 'discover' ? <DiscoveryView /> : <SynthesisView />}
    </div>
  </section>;
}
