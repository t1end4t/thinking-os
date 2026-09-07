import React, { useState } from 'react';
import {
  GitFork,
  BookOpen,
  Lightbulb,
  ShieldAlert,
  Sparkles,
  Layers,
  ChevronDown,
  ChevronRight,
  Move,
  CornerDownRight,
  Maximize2
} from 'lucide-react';
import { LearningUnit } from '../../../learnTypes';
import { MathView } from '../../common/MathView';
import { useWorkspace } from '../../../context/WorkspaceContext';
import { AssistantContextObject } from '../../../types';

interface ConceptMindmapTreeProps {
  unit: LearningUnit;
}

export const ConceptMindmapTree: React.FC<ConceptMindmapTreeProps> = ({ unit }) => {
  const { addAttachedContext, setIsDockOpen } = useWorkspace();
  const [collapsedBranches, setCollapsedBranches] = useState<Record<string, boolean>>({});
  const [selectedLeafId, setSelectedLeafId] = useState<string | null>(null);

  const toggleBranch = (branchId: string) => {
    setCollapsedBranches(prev => ({
      ...prev,
      [branchId]: !prev[branchId]
    }));
  };

  const handleAskAiAboutItem = (label: string, details: string, latex?: string) => {
    setIsDockOpen(true);
    const ctx: AssistantContextObject = {
      type: 'artifact',
      id: `mindmap-${Date.now()}`,
      label,
      secondaryLabel: 'Concept Mindmap Node',
      metadata: {
        description: details,
        latex: latex || ''
      }
    };
    addAttachedContext(ctx);
  };

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Mindmap Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-rule)] pb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 flex items-center justify-center">
            <GitFork size={15} />
          </div>
          <div>
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--color-ink)]">
              Epistemic Mindmap & Concept Tree
            </h3>
            <p className="text-[0.6875rem] text-[var(--color-ink-muted)]">
              Hierarchical mindmap linking foundational axioms, geometric intuition, stress-tests, and research bridges.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-[var(--color-ink-muted)]">
          <span className="flex items-center gap-1">
            <Move size={12} className="text-sky-500" />
            <span>Drag any node to AI</span>
          </span>
        </div>
      </div>

      {/* MINDMAP CANVAS CONTAINER */}
      <div className="relative w-full rounded-2xl border border-[var(--color-rule)] bg-[var(--color-paper)] p-6 overflow-x-auto shadow-xs">
        {/* ROOT TOPIC NODE */}
        <div className="flex items-center gap-3 p-4 rounded-xl border-2 border-emerald-500/60 bg-emerald-50/30 dark:bg-emerald-950/30 max-w-2xl mb-8 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold text-sm shrink-0">
            Ω
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[0.625rem] font-mono uppercase px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 font-semibold">
                {unit.category}
              </span>
              <span className="text-[0.625rem] font-mono text-[var(--color-ink-muted)]">
                {unit.difficulty}
              </span>
            </div>
            <h2 className="text-sm md:text-base font-bold text-[var(--color-ink)] mt-1 truncate">
              {unit.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => handleAskAiAboutItem(unit.title, unit.description)}
            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-mono flex items-center gap-1 shrink-0 transition-colors shadow-2xs"
          >
            <Sparkles size={11} />
            <span>Ask AI</span>
          </button>
        </div>

        {/* BRANCHES GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
          {/* BRANCH 1: Foundations & Axioms */}
          <div className="flex flex-col gap-3 p-4 rounded-xl border border-[var(--color-rule)] bg-[var(--color-surface)]/80">
            <div
              onClick={() => toggleBranch('axioms')}
              className="flex items-center justify-between cursor-pointer select-none border-b border-[var(--color-rule)] pb-2"
            >
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider">
                <BookOpen size={14} />
                <span>Foundational Axioms & Identities</span>
                <span className="px-1.5 py-0.2 rounded bg-sky-100 dark:bg-sky-950 text-[0.625rem]">
                  {unit.remembering.axiomsAndIdentities.length}
                </span>
              </div>
              <button type="button" className="text-slate-400">
                {collapsedBranches['axioms'] ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
              </button>
            </div>

            {!collapsedBranches['axioms'] && (
              <div className="flex flex-col gap-3 pt-1">
                {unit.remembering.axiomsAndIdentities.map((axiom, idx) => (
                  <div
                    key={axiom.id || idx}
                    draggable={true}
                    onDragStart={e => {
                      const ctx: AssistantContextObject = {
                        type: 'artifact',
                        id: `axiom-${axiom.id}`,
                        label: axiom.name,
                        secondaryLabel: 'Mathematical Axiom',
                        metadata: {
                          latex: axiom.latex,
                          statement: axiom.statement,
                          significance: axiom.significance
                        }
                      };
                      e.dataTransfer.setData('application/json', JSON.stringify(ctx));
                      e.dataTransfer.setData('text/plain', `Axiom: ${axiom.name}\nFormula: ${axiom.latex}\n${axiom.statement}`);
                    }}
                    className="p-3 rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper)] hover:border-sky-400/60 transition-all flex flex-col gap-2 group cursor-grab active:cursor-grabbing"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-semibold text-[var(--color-ink)]">
                        {axiom.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleAskAiAboutItem(axiom.name, axiom.statement, axiom.latex)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950 rounded transition-all"
                        title="Query AI about this axiom"
                      >
                        <Sparkles size={12} />
                      </button>
                    </div>

                    <div className="py-1 px-2 rounded bg-[var(--color-surface)] border border-[var(--color-rule)]/60 text-center font-serif text-xs">
                      <MathView math={axiom.latex} block={false} showAiAction={false} />
                    </div>

                    <p className="text-[0.6875rem] text-[var(--color-ink-muted)] leading-relaxed">
                      {axiom.significance}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* BRANCH 2: Geometric & Physical Intuition */}
          <div className="flex flex-col gap-3 p-4 rounded-xl border border-[var(--color-rule)] bg-[var(--color-surface)]/80">
            <div
              onClick={() => toggleBranch('intuition')}
              className="flex items-center justify-between cursor-pointer select-none border-b border-[var(--color-rule)] pb-2"
            >
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                <Lightbulb size={14} />
                <span>Geometric & Physical Intuition</span>
              </div>
              <button type="button" className="text-slate-400">
                {collapsedBranches['intuition'] ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
              </button>
            </div>

            {!collapsedBranches['intuition'] && (
              <div className="flex flex-col gap-3 pt-1">
                {/* Visual Metaphor */}
                <div
                  draggable={true}
                  onDragStart={e => {
                    const ctx: AssistantContextObject = {
                      type: 'passage',
                      id: `intuition-metaphor-${unit.id}`,
                      label: `Visual Metaphor: ${unit.title}`,
                      secondaryLabel: 'Geometric Intuition',
                      metadata: {
                        text: unit.understanding.geometricIntuition.visualMetaphor
                      }
                    };
                    e.dataTransfer.setData('application/json', JSON.stringify(ctx));
                    e.dataTransfer.setData('text/plain', unit.understanding.geometricIntuition.visualMetaphor);
                  }}
                  className="p-3 rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper)] flex flex-col gap-1 cursor-grab active:cursor-grabbing hover:border-amber-400/60 transition-all"
                >
                  <span className="text-[0.6875rem] font-mono uppercase text-amber-600 dark:text-amber-400 font-semibold">
                    Visual Metaphor
                  </span>
                  <p className="text-xs text-[var(--color-ink)] leading-relaxed">
                    {unit.understanding.geometricIntuition.visualMetaphor}
                  </p>
                </div>

                {/* Physical Interpretation */}
                <div
                  draggable={true}
                  onDragStart={e => {
                    const ctx: AssistantContextObject = {
                      type: 'passage',
                      id: `intuition-physical-${unit.id}`,
                      label: `Physical Interpretation: ${unit.title}`,
                      secondaryLabel: 'Geometric Intuition',
                      metadata: {
                        text: unit.understanding.geometricIntuition.physicalInterpretation
                      }
                    };
                    e.dataTransfer.setData('application/json', JSON.stringify(ctx));
                    e.dataTransfer.setData('text/plain', unit.understanding.geometricIntuition.physicalInterpretation);
                  }}
                  className="p-3 rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper)] flex flex-col gap-1 cursor-grab active:cursor-grabbing hover:border-amber-400/60 transition-all"
                >
                  <span className="text-[0.6875rem] font-mono uppercase text-amber-600 dark:text-amber-400 font-semibold">
                    Physical Interpretation
                  </span>
                  <p className="text-xs text-[var(--color-ink)] leading-relaxed">
                    {unit.understanding.geometricIntuition.physicalInterpretation}
                  </p>
                </div>

                {/* Core Insight */}
                <div className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-50/10 dark:bg-emerald-950/20 flex flex-col gap-1">
                  <span className="text-[0.6875rem] font-mono uppercase text-emerald-600 dark:text-emerald-400 font-semibold">
                    Core Mathematical Insight
                  </span>
                  <p className="text-xs text-[var(--color-ink)] leading-relaxed">
                    {unit.understanding.geometricIntuition.coreInsight}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* BRANCH 3: Structural Components & Invariants */}
          <div className="flex flex-col gap-3 p-4 rounded-xl border border-[var(--color-rule)] bg-[var(--color-surface)]/80">
            <div
              onClick={() => toggleBranch('components')}
              className="flex items-center justify-between cursor-pointer select-none border-b border-[var(--color-rule)] pb-2"
            >
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                <Layers size={14} />
                <span>Structural Components & Invariants</span>
                <span className="px-1.5 py-0.2 rounded bg-indigo-100 dark:bg-indigo-950 text-[0.625rem]">
                  {unit.understanding.conceptDecomposition.length}
                </span>
              </div>
              <button type="button" className="text-slate-400">
                {collapsedBranches['components'] ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
              </button>
            </div>

            {!collapsedBranches['components'] && (
              <div className="flex flex-col gap-2.5 pt-1">
                {unit.understanding.conceptDecomposition.map((dec, idx) => (
                  <div
                    key={idx}
                    draggable={true}
                    onDragStart={e => {
                      const ctx: AssistantContextObject = {
                        type: 'artifact',
                        id: `comp-${idx}`,
                        label: dec.part,
                        secondaryLabel: 'Component Role',
                        metadata: {
                          role: dec.role,
                          impactIfMissing: dec.impactIfMissing
                        }
                      };
                      e.dataTransfer.setData('application/json', JSON.stringify(ctx));
                      e.dataTransfer.setData('text/plain', `Component: ${dec.part}\nRole: ${dec.role}\nImpact if absent: ${dec.impactIfMissing}`);
                    }}
                    className="p-3 rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper)] flex flex-col gap-1 cursor-grab active:cursor-grabbing hover:border-indigo-400/60 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-[var(--color-ink)]">
                        {dec.part}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleAskAiAboutItem(dec.part, dec.role)}
                        className="text-[0.625rem] font-mono text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                      >
                        <Sparkles size={10} />
                        <span>AI Check</span>
                      </button>
                    </div>
                    <p className="text-[0.6875rem] text-[var(--color-ink-muted)] leading-relaxed">
                      {dec.role}
                    </p>
                    <p className="text-[0.625rem] font-mono text-rose-600 dark:text-rose-400">
                      If missing: {dec.impactIfMissing}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* BRANCH 4: Stress-Tests & Boundary Conditions */}
          <div className="flex flex-col gap-3 p-4 rounded-xl border border-[var(--color-rule)] bg-[var(--color-surface)]/80">
            <div
              onClick={() => toggleBranch('stresstests')}
              className="flex items-center justify-between cursor-pointer select-none border-b border-[var(--color-rule)] pb-2"
            >
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
                <ShieldAlert size={14} />
                <span>Assumption Stress-Tests & Failure Modes</span>
                <span className="px-1.5 py-0.2 rounded bg-rose-100 dark:bg-rose-950 text-[0.625rem]">
                  {unit.analyzing.assumptionStressTests.length}
                </span>
              </div>
              <button type="button" className="text-slate-400">
                {collapsedBranches['stresstests'] ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
              </button>
            </div>

            {!collapsedBranches['stresstests'] && (
              <div className="flex flex-col gap-2.5 pt-1">
                {unit.analyzing.assumptionStressTests.map((test, idx) => (
                  <div
                    key={test.id || idx}
                    draggable={true}
                    onDragStart={e => {
                      const ctx: AssistantContextObject = {
                        type: 'artifact',
                        id: `stresstest-${test.id}`,
                        label: test.assumption,
                        secondaryLabel: 'Stress-Test',
                        metadata: {
                          failureMode: test.failureMode,
                          mathematicalConsequence: test.mathematicalConsequence,
                          implication: test.llmResearchImplication
                        }
                      };
                      e.dataTransfer.setData('application/json', JSON.stringify(ctx));
                      e.dataTransfer.setData('text/plain', `Assumption: ${test.assumption}\nFailure: ${test.failureMode}\n${test.mathematicalConsequence}`);
                    }}
                    className="p-3 rounded-lg border border-rose-500/20 bg-rose-50/10 dark:bg-rose-950/10 flex flex-col gap-1.5 cursor-grab active:cursor-grabbing hover:border-rose-400/60 transition-all"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-semibold text-rose-700 dark:text-rose-300">
                        {test.assumption}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleAskAiAboutItem(`Stress-test: ${test.assumption}`, test.mathematicalConsequence)}
                        className="text-[0.625rem] font-mono text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 shrink-0"
                      >
                        <Sparkles size={10} />
                        <span>Falsify</span>
                      </button>
                    </div>
                    <div className="text-[0.6875rem] text-[var(--color-ink)] font-mono bg-[var(--color-surface)] p-1.5 rounded border border-[var(--color-rule)]">
                      {test.failureMode}
                    </div>
                    <p className="text-[0.6875rem] text-[var(--color-ink-muted)] leading-relaxed">
                      {test.mathematicalConsequence}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
