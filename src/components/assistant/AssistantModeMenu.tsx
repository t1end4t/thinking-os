import { Check, ChevronDown, MessageCircle, Terminal } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useDetailsMenu } from './useDetailsMenu';

const MODES = [
  { id: 'chat' as const, label: 'Chat', hint: 'Works in your vault and reads attached objects' },
  { id: 'codex' as const, label: 'Codex', hint: 'Sends your prompt unchanged' }
];

export function AssistantModeMenu({ onSelect }: { onSelect?: (mode: 'chat' | 'codex') => void }) {
  const { codexAssistant } = useWorkspace();
  const { mode, setMode, running } = codexAssistant;
  const { ref: switcher, dismiss } = useDetailsMenu();
  const active = MODES.find(entry => entry.id === mode) ?? MODES[0];
  const buttonClass = 'rounded-md px-2 py-1.5 text-[0.75rem] hover:bg-[var(--accent-indigo-soft)]';

  return (
    <details ref={switcher} className="assistant-switcher assistant-mode-menu">
      <summary aria-label={`Assistant mode: ${active.label}`} title={`${active.label}\n${active.hint}`}>
        {mode === 'chat' ? <MessageCircle className="w-3.5 h-3.5 shrink-0" aria-hidden /> : <Terminal className="w-3.5 h-3.5 shrink-0" aria-hidden />}
        <span className="truncate">{active.label}</span>
        <ChevronDown className="w-3 h-3 shrink-0" aria-hidden />
      </summary>
      <div className="assistant-switcher-menu assistant-mode-menu-panel">
        <nav aria-label="Assistant modes">
          {MODES.map(entry => (
            <button
              key={entry.id}
              type="button"
              disabled={running}
              aria-current={entry.id === mode ? 'true' : undefined}
              title={entry.hint}
              onClick={() => { setMode(entry.id); onSelect?.(entry.id); dismiss(); }}
              className={`${buttonClass} flex w-full min-w-0 items-center gap-2 text-left`}
            >
              {entry.id === mode ? <Check className="w-3.5 h-3.5 shrink-0 text-[var(--accent-indigo)]" aria-hidden /> : <span className="w-3.5 shrink-0" aria-hidden />}
              <span className="min-w-0 flex-1">
                <span className="block truncate">{entry.label}</span>
                <span className="block truncate text-[0.6875rem] text-[var(--color-ink-muted)]">{entry.hint}</span>
              </span>
            </button>
          ))}
        </nav>
      </div>
    </details>
  );
}
