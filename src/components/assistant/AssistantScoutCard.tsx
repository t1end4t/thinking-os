import type { ScoutBrief, ScoutBriefInput, ScoutReport, ScoutRun } from '../../scoutTypes';
import { AgentRunCard, type AgentKind } from './AgentRunCard';

export function AssistantScoutCard({
  brief,
  run,
  report,
  busy,
  agentKind = 'scout',
  agentTitle = 'Literature Scout Agent',
  onSave,
  onRun,
  onCancel,
  onOpenReport
}: {
  readonly brief: ScoutBrief;
  readonly run?: ScoutRun;
  readonly report?: ScoutReport;
  readonly busy: boolean;
  readonly agentKind?: AgentKind;
  readonly agentTitle?: string;
  readonly onSave: (input: ScoutBriefInput) => Promise<boolean>;
  readonly onRun: () => Promise<boolean>;
  readonly onCancel: () => Promise<boolean>;
  readonly onOpenReport: () => void;
}) {
  return (
    <AgentRunCard
      brief={brief}
      run={run}
      report={report}
      busy={busy}
      agentKind={agentKind}
      agentTitle={agentTitle}
      onSave={onSave}
      onRun={onRun}
      onCancel={onCancel}
      onOpenReport={onOpenReport}
    />
  );
}

export { AgentRunCard };

