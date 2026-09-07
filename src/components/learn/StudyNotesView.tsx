import React, { useState, useEffect } from 'react';
import {
  FileText,
  Save,
  CheckCircle2,
  Sparkles,
  BookOpen,
  HelpCircle,
  Lightbulb,
  ExternalLink,
  Code
} from 'lucide-react';
import { LearningUnit } from '../../learnTypes';

interface StudyNotesViewProps {
  unit: LearningUnit;
  onUpdateUnit: (updates: Partial<LearningUnit>) => void;
}

export const StudyNotesView: React.FC<StudyNotesViewProps> = ({
  unit,
  onUpdateUnit
}) => {
  const [notes, setNotes] = useState(unit.studyNotes || '');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle');

  // Keep local state in sync when active unit changes
  useEffect(() => {
    setNotes(unit.studyNotes || '');
  }, [unit.id, unit.studyNotes]);

  const handleSaveNotes = (textToSave?: string) => {
    const content = textToSave !== undefined ? textToSave : notes;
    onUpdateUnit({ studyNotes: content });
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 2000);
  };

  const handleInsertTemplate = (templateType: 'summary' | 'intuition' | 'doubt' | 'research') => {
    let snippet = '';
    switch (templateType) {
      case 'intuition':
        snippet = `\n\n### 💡 Intuitive Mental Model\n- **The Big Picture**: In plain English, this is like...\n- **Why it matters**: Without this, the model or math fails because...\n- **Key Analogy**: ...\n`;
        break;
      case 'summary':
        snippet = `\n\n### 📌 Key Takeaways\n1. **Core Mechanism**: ...\n2. **Critical Assumption**: ...\n3. **Practical Gotcha**: ...\n`;
        break;
      case 'doubt':
        snippet = `\n\n### ❓ Open Questions & Edge Cases\n- What happens in high dimensions ($d \\gg 1000$)?\n- Does this bound hold under non-Gaussian noise?\n- Needs further verification: ...\n`;
        break;
      case 'research':
        snippet = `\n\n### 🔬 Bridge to My Research\n- **Hypothesis**: Could we replace this component in our experiment?\n- **Related Paper**: [Title or arXiv ID]\n- **Action Item**: Implement a minimal test in Python.\n`;
        break;
    }

    const updated = notes + snippet;
    setNotes(updated);
    handleSaveNotes(updated);
  };

  const wordCount = notes.trim().length > 0 ? notes.trim().split(/\s+/).length : 0;

  return (
    <div className="flex flex-col gap-5 max-w-5xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="p-4 md:p-5 rounded-2xl border border-[var(--color-rule)] bg-[var(--color-paper)] flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
            <FileText size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
              <span>Personal Study Scratchpad</span>
              <span className="text-[var(--color-ink-muted)]">•</span>
              <span className="text-[var(--color-ink-muted)]">Active Synthesis</span>
            </div>
            <p className="text-xs text-[var(--color-ink-muted)] mt-0.5 max-w-xl leading-relaxed">
              Record your personal insights, intuition analogies, counter-examples, and research questions as you learn {unit.title}.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end md:self-auto shrink-0">
          <span className="text-[0.6875rem] font-mono text-[var(--color-ink-muted)]">
            {wordCount} words
          </span>
          <button
            type="button"
            onClick={() => handleSaveNotes()}
            className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
          >
            {saveStatus === 'saved' ? (
              <>
                <CheckCircle2 size={13} className="text-emerald-200" />
                <span>Saved!</span>
              </>
            ) : (
              <>
                <Save size={13} />
                <span>Save Notes</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Quick-Prompt Thought Starters */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[0.6875rem] font-mono text-[var(--color-ink-muted)] uppercase tracking-wider">
          Insert Prompt Template:
        </span>
        <button
          type="button"
          onClick={() => handleInsertTemplate('intuition')}
          className="px-2.5 py-1 rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper)] hover:bg-[var(--color-surface)] text-xs text-[var(--color-ink)] flex items-center gap-1.5 transition-colors shadow-2xs"
        >
          <Lightbulb size={12} className="text-amber-500" />
          <span>Mental Model</span>
        </button>
        <button
          type="button"
          onClick={() => handleInsertTemplate('summary')}
          className="px-2.5 py-1 rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper)] hover:bg-[var(--color-surface)] text-xs text-[var(--color-ink)] flex items-center gap-1.5 transition-colors shadow-2xs"
        >
          <BookOpen size={12} className="text-sky-500" />
          <span>Core Takeaways</span>
        </button>
        <button
          type="button"
          onClick={() => handleInsertTemplate('doubt')}
          className="px-2.5 py-1 rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper)] hover:bg-[var(--color-surface)] text-xs text-[var(--color-ink)] flex items-center gap-1.5 transition-colors shadow-2xs"
        >
          <HelpCircle size={12} className="text-rose-500" />
          <span>Open Doubts</span>
        </button>
        <button
          type="button"
          onClick={() => handleInsertTemplate('research')}
          className="px-2.5 py-1 rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper)] hover:bg-[var(--color-surface)] text-xs text-[var(--color-ink)] flex items-center gap-1.5 transition-colors shadow-2xs"
        >
          <Sparkles size={12} className="text-purple-500" />
          <span>Research Bridge</span>
        </button>
      </div>

      {/* Markdown Notes Editor */}
      <div className="border border-[var(--color-rule)] rounded-2xl bg-[var(--color-surface)] overflow-hidden shadow-xs flex flex-col">
        <div className="p-3 bg-[var(--color-paper)] border-b border-[var(--color-rule)] flex items-center justify-between text-xs text-[var(--color-ink-muted)]">
          <span className="font-mono text-[0.6875rem] uppercase tracking-wider font-semibold">
            Markdown Note Pad
          </span>
          <span className="text-[0.6875rem] font-mono">
            Auto-syncs with your research vault
          </span>
        </div>

        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          onBlur={() => handleSaveNotes()}
          placeholder={`Jot down your understanding of ${unit.title}...\n\n- How does this connect to what you already knew?\n- Where does the geometric intuition break down?\n- Ideas for experiments or papers you want to write...`}
          rows={14}
          className="w-full p-4 bg-transparent text-xs md:text-sm font-mono text-[var(--color-ink)] placeholder:text-[var(--color-ink-muted)] focus:outline-none resize-y leading-relaxed"
        />

        <div className="p-3 bg-[var(--color-paper)] border-t border-[var(--color-rule)] flex items-center justify-between text-[0.6875rem] text-[var(--color-ink-muted)]">
          <span>Tip: You can use Markdown headings (#, ##), bullet points, and LaTeX-style notation.</span>
          {saveStatus === 'saved' && (
            <span className="text-emerald-600 dark:text-emerald-400 font-mono font-bold">
              Changes saved to unit
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
