import React, { useState, useMemo } from 'react';
import {
  Calculator,
  Sliders,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  HelpCircle,
  Eye,
  EyeOff,
  Sparkles,
  RotateCcw,
  Move,
  Bot,
  Zap
} from 'lucide-react';
import { LearningUnit } from '../../../learnTypes';
import { MathView } from '../../common/MathView';
import { useWorkspace } from '../../../context/WorkspaceContext';
import { AssistantContextObject } from '../../../types';

interface ApplyingViewProps {
  unit: LearningUnit;
  onUpdateProgress: (score: number) => void;
  onUpdateUnit: (updates: Partial<LearningUnit>) => void;
}

export const ApplyingView: React.FC<ApplyingViewProps> = ({
  unit,
  onUpdateProgress
}) => {
  const { addAttachedContext, setIsDockOpen } = useWorkspace();

  const handleAskAiDerivation = (derivation: typeof unit.applying.workedDerivations[0]) => {
    setIsDockOpen(true);
    const ctx: AssistantContextObject = {
      type: 'artifact',
      id: `derivation-${unit.id}-${derivation.id}`,
      label: derivation.title,
      secondaryLabel: `Mathematical Derivation: ${unit.title}`,
      metadata: {
        problemStatement: derivation.problemStatement,
        stepsCount: derivation.steps.length,
        conclusion: derivation.conclusion
      }
    };
    addAttachedContext(ctx);
  };

  const handleAskAiChallenge = (challenge: typeof unit.applying.practiceChallenges[0]) => {
    setIsDockOpen(true);
    const ctx: AssistantContextObject = {
      type: 'artifact',
      id: `challenge-${unit.id}-${challenge.id}`,
      label: challenge.question.slice(0, 45) + '...',
      secondaryLabel: `Practice Challenge: ${unit.title}`,
      metadata: {
        question: challenge.question,
        mathContext: challenge.mathContext || '',
        hints: (challenge.hints || []).join('; ')
      }
    };
    addAttachedContext(ctx);
  };

  // Expansion state for derivations
  const [expandedDerivations, setExpandedDerivations] = useState<Record<string, boolean>>({
    '0': true
  });

  // Solved challenges state
  const [solvedChallenges, setSolvedChallenges] = useState<Record<string, boolean>>({});
  const [revealedSolutions, setRevealedSolutions] = useState<Record<string, boolean>>({});

  // Interactive Simulator Parameters
  // Softmax simulator state
  const [temperature, setTemperature] = useState<number>(1.0);
  const [logits, setLogits] = useState<[number, number, number, number]>([2.5, 1.2, 0.4, 3.8]);

  // LoRA simulator state
  const [loraD, setLoraD] = useState<number>(4096);
  const [loraK, setLoraK] = useState<number>(4096);
  const [loraRank, setLoraRank] = useState<number>(8);

  // General learning rate / weight decay simulation state
  const [lr, setLr] = useState<number>(0.001);
  const [weightDecay, setWeightDecay] = useState<number>(0.01);
  const [gradNorm, setGradNorm] = useState<number>(1.5);

  // Computed Softmax Distribution
  const softmaxResults = useMemo(() => {
    const scaled = logits.map(z => z / Math.max(temperature, 0.01));
    const maxZ = Math.max(...scaled);
    const expZ = scaled.map(z => Math.exp(z - maxZ));
    const sumExp = expZ.reduce((a, b) => a + b, 0);
    const probs = expZ.map(e => e / sumExp);

    // Shannon Entropy H(p) = - sum p_i log2(p_i)
    const entropy = -probs.reduce((sum, p) => (p > 0 ? sum + p * Math.log2(p) : sum), 0);
    const maxP = Math.max(...probs);

    return { probs, entropy, maxP };
  }, [logits, temperature]);

  // Computed LoRA Stats
  const loraResults = useMemo(() => {
    const originalParams = loraD * loraK;
    const loraParams = loraRank * (loraD + loraK);
    const compressionRatio = (originalParams / Math.max(loraParams, 1)).toFixed(1);
    const percentage = ((loraParams / Math.max(originalParams, 1)) * 100).toFixed(2);
    const memorySavedMb = (((originalParams - loraParams) * 2) / (1024 * 1024)).toFixed(2);

    return { originalParams, loraParams, compressionRatio, percentage, memorySavedMb };
  }, [loraD, loraK, loraRank]);

  const toggleDerivation = (index: number) => {
    setExpandedDerivations(prev => ({ ...prev, [`${index}`]: !prev[`${index}`] }));
  };

  const toggleSolveChallenge = (challengeId: string) => {
    const next = { ...solvedChallenges, [challengeId]: !solvedChallenges[challengeId] };
    setSolvedChallenges(next);

    const total = unit.applying.practiceChallenges.length;
    const solvedCount = Object.values(next).filter(Boolean).length;
    const score = total > 0 ? Math.round((solvedCount / total) * 100) : 100;
    onUpdateProgress(score);
  };

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto pb-12">
      {/* Level Banner */}
      <div className="p-4 rounded-xl border border-[var(--color-rule)] bg-[var(--color-paper)] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wider">
            <Calculator size={15} />
            <span>Cognitive Level 3: Applying</span>
          </div>
          <p className="text-xs text-[var(--color-ink-muted)] mt-1">
            Executing mathematical derivations step-by-step, manipulating parameterized simulations, and solving practical architecture challenges.
          </p>
        </div>
        <div className="text-right shrink-0">
          <div className="text-xs font-mono text-[var(--color-ink-muted)]">Application Score</div>
          <div className="text-base font-mono font-bold text-amber-600 dark:text-amber-400">
            {unit.progress.applying}%
          </div>
        </div>
      </div>

      {/* Interactive Mathematics Playground */}
      <div className="p-5 rounded-xl border border-[var(--color-rule)] bg-[var(--color-surface)] flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[var(--color-ink-muted)]">
            <Sliders size={14} className="text-amber-500" />
            <span>Live Interactive Mathematical Simulation</span>
          </div>
          <span className="text-[0.6875rem] font-mono px-2 py-0.5 rounded bg-[var(--color-paper)] border border-[var(--color-rule)] text-[var(--color-ink-muted)]">
            Active Parameters
          </span>
        </div>

        {/* Dynamic Simulator based on unit category or content */}
        {unit.title.toLowerCase().includes('softmax') || unit.title.toLowerCase().includes('attention') ? (
          /* Softmax Temperature & Attention Simulator */
          <div className="flex flex-col gap-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 rounded-xl bg-[var(--color-paper)] border border-[var(--color-rule)]">
              {/* Controls Column */}
              <div className="flex flex-col gap-4">
                <div>
                  <div className="flex justify-between items-center text-xs mb-1.5 font-mono">
                    <span className="text-[var(--color-ink)] font-medium">Temperature (τ)</span>
                    <span className="font-bold text-amber-600 dark:text-amber-400">{temperature.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.05"
                    max="3.0"
                    step="0.05"
                    value={temperature}
                    onChange={e => setTemperature(parseFloat(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[0.6875rem] text-[var(--color-ink-muted)] font-mono mt-1">
                    <span>τ → 0 (Argmax / Sharp)</span>
                    <span>τ = 1 (Standard)</span>
                    <span>τ → ∞ (Uniform)</span>
                  </div>
                </div>

                {/* Logits Sliders */}
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-mono text-[var(--color-ink-muted)]">Input Attention Logits (z₁ .. z₄):</span>
                  {logits.map((z, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <span className="text-xs font-mono w-6 text-[var(--color-ink-muted)]">z_{idx + 1}</span>
                      <input
                        type="range"
                        min="-2.0"
                        max="6.0"
                        step="0.1"
                        value={z}
                        onChange={e => {
                          const val = parseFloat(e.target.value);
                          const next: [number, number, number, number] = [...logits];
                          next[idx] = val;
                          setLogits(next);
                        }}
                        className="flex-1 accent-amber-500 cursor-pointer"
                      />
                      <span className="text-xs font-mono w-10 text-right text-[var(--color-ink)]">{z.toFixed(1)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Real-time Output Column */}
              <div className="flex flex-col justify-between gap-4">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-[var(--color-ink-muted)]">Resulting Softmax Distribution p_i:</span>
                    <span className="text-amber-600 dark:text-amber-400 font-bold">
                      Entropy H(p) = {softmaxResults.entropy.toFixed(3)} bits
                    </span>
                  </div>

                  {/* Distribution Bars */}
                  <div className="flex flex-col gap-2">
                    {softmaxResults.probs.map((p, idx) => (
                      <div key={idx} className="flex flex-col gap-1">
                        <div className="flex justify-between text-xs font-mono">
                          <span>Token {idx + 1} (z_{idx + 1}={logits[idx].toFixed(1)})</span>
                          <span className="font-semibold">{(p * 100).toFixed(1)}%</span>
                        </div>
                        <div className="w-full h-3 bg-[var(--color-surface)] rounded-full overflow-hidden border border-[var(--color-rule)]">
                          <div
                            className="h-full bg-amber-500 rounded-full transition-all duration-150"
                            style={{ width: `${Math.max(p * 100, 1)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-2.5 rounded-lg border border-[var(--color-rule)] bg-[var(--color-surface)] text-[0.7188rem] text-[var(--color-ink-muted)]">
                  <strong>Mathematical insight:</strong> As temperature τ decreases below 0.5, peak probabilities saturate toward 1.0 (entropy plummets to 0). At τ &gt; 2.0, distribution approaches uniform 1/K = 0.25.
                </div>
              </div>
            </div>
          </div>
        ) : unit.title.toLowerCase().includes('lora') || unit.title.toLowerCase().includes('rank') ? (
          /* LoRA Matrix Algebra Simulator */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 rounded-xl bg-[var(--color-paper)] border border-[var(--color-rule)]">
            <div className="flex flex-col gap-4">
              <div>
                <div className="flex justify-between text-xs font-mono mb-1">
                  <span>Adapter Rank (r)</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400">{loraRank}</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="64"
                  step="1"
                  value={loraRank}
                  onChange={e => setLoraRank(parseInt(e.target.value, 10))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-mono mb-1">
                  <span>Input Dimension d_in</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400">{loraD}</span>
                </div>
                <input
                  type="range"
                  min="512"
                  max="8192"
                  step="512"
                  value={loraD}
                  onChange={e => setLoraD(parseInt(e.target.value, 10))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-mono mb-1">
                  <span>Output Dimension d_out</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400">{loraK}</span>
                </div>
                <input
                  type="range"
                  min="512"
                  max="8192"
                  step="512"
                  value={loraK}
                  onChange={e => setLoraK(parseInt(e.target.value, 10))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>
            </div>

            <div className="flex flex-col justify-between p-3 rounded-lg bg-[var(--color-surface)] border border-[var(--color-rule)]">
              <div className="flex flex-col gap-2 font-mono text-xs">
                <div className="flex justify-between pb-2 border-b border-[var(--color-rule)]">
                  <span className="text-[var(--color-ink-muted)]">Full Matrix W₀:</span>
                  <span className="font-semibold">{loraResults.originalParams.toLocaleString()} parameters</span>
                </div>
                <div className="flex justify-between pb-2 border-b border-[var(--color-rule)]">
                  <span className="text-[var(--color-ink-muted)]">LoRA (B · A):</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {loraResults.loraParams.toLocaleString()} parameters
                  </span>
                </div>
                <div className="flex justify-between pb-2 border-b border-[var(--color-rule)]">
                  <span className="text-[var(--color-ink-muted)]">Memory Savings:</span>
                  <span className="font-semibold text-amber-600 dark:text-amber-400">
                    {loraResults.compressionRatio}x compression ({loraResults.percentage}% of original)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--color-ink-muted)]">FP16 Weight Delta:</span>
                  <span className="font-semibold">{loraResults.memorySavedMb} MB saved per layer</span>
                </div>
              </div>

              <div className="text-[0.7188rem] text-[var(--color-ink-muted)] mt-3">
                Notice: Rank r ≪ min(d, k). Gradient updates are constrained to intrinsic rank subspace, maintaining full expressivity for downstream alignment.
              </div>
            </div>
          </div>
        ) : (
          /* General Optimization / Gradient Simulator */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 rounded-xl bg-[var(--color-paper)] border border-[var(--color-rule)]">
            <div className="flex flex-col gap-4">
              <div>
                <div className="flex justify-between text-xs font-mono mb-1">
                  <span>Learning Rate (η)</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400">{lr}</span>
                </div>
                <input
                  type="range"
                  min="0.0001"
                  max="0.01"
                  step="0.0001"
                  value={lr}
                  onChange={e => setLr(parseFloat(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-mono mb-1">
                  <span>Weight Decay (λ)</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400">{weightDecay}</span>
                </div>
                <input
                  type="range"
                  min="0.001"
                  max="0.2"
                  step="0.005"
                  value={weightDecay}
                  onChange={e => setWeightDecay(parseFloat(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-mono mb-1">
                  <span>Gradient Norm ||g||</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400">{gradNorm.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="10.0"
                  step="0.1"
                  value={gradNorm}
                  onChange={e => setGradNorm(parseFloat(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>
            </div>

            <div className="flex flex-col justify-between p-3 rounded-lg bg-[var(--color-surface)] border border-[var(--color-rule)] text-xs font-mono">
              <div className="flex flex-col gap-2.5">
                <div className="flex justify-between">
                  <span className="text-[var(--color-ink-muted)]">Decoupled Decay Step:</span>
                  <span className="font-semibold text-amber-600 dark:text-amber-400">
                    θ ← (1 - {(lr * weightDecay).toFixed(6)}) · θ
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--color-ink-muted)]">Effective Gradient Scale:</span>
                  <span className="font-semibold">{(lr * gradNorm).toFixed(5)}</span>
                </div>
              </div>
              <div className="text-[0.7188rem] text-[var(--color-ink-muted)]">
                In AdamW, weight decay does not depend on past second moments v_t, stabilizing regularized spectral norm across ill-conditioned directions.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Step-by-Step Worked Mathematical Derivations */}
      <div className="flex flex-col gap-3">
        <h3 className="text-xs font-mono uppercase tracking-wider text-[var(--color-ink-muted)] flex items-center gap-1.5">
          <Sparkles size={14} className="text-amber-500" />
          <span>Step-by-Step Worked Derivations ({unit.applying.workedDerivations.length})</span>
        </h3>

        <div className="flex flex-col gap-4">
          {unit.applying.workedDerivations.map((derivation, dIdx) => {
            const isExpanded = expandedDerivations[`${dIdx}`] ?? true;

            return (
              <div
                key={derivation.id || dIdx}
                className="rounded-xl border border-[var(--color-rule)] bg-[var(--color-surface)] overflow-hidden"
              >
                {/* Derivation Header */}
                <div
                  draggable={true}
                  onDragStart={e => {
                    const ctx: AssistantContextObject = {
                      type: 'artifact',
                      id: `derivation-${unit.id}-${derivation.id}`,
                      label: derivation.title,
                      secondaryLabel: `Mathematical Derivation: ${unit.title}`,
                      metadata: {
                        problemStatement: derivation.problemStatement,
                        stepsCount: derivation.steps.length,
                        conclusion: derivation.conclusion
                      }
                    };
                    e.dataTransfer.setData('application/json', JSON.stringify(ctx));
                    e.dataTransfer.setData(
                      'text/plain',
                      `Mathematical Derivation: ${derivation.title}\nProblem: ${derivation.problemStatement}\nConclusion: ${derivation.conclusion}`
                    );
                  }}
                  className="p-4 bg-[var(--color-paper)] border-b border-[var(--color-rule)] flex items-center justify-between cursor-pointer hover:bg-[var(--color-rule)]/20 transition-colors"
                >
                  <div
                    onClick={() => toggleDerivation(dIdx)}
                    className="flex items-center gap-2 flex-1"
                  >
                    {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    <div>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[0.625rem] font-mono text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                          Derivation 0{dIdx + 1}
                        </span>
                        <span className="text-[0.625rem] font-mono text-slate-400 flex items-center gap-0.5">
                          <Move size={9} className="text-amber-500" />
                          <span>Drag to AI</span>
                        </span>
                      </div>
                      <h4 className="text-xs md:text-sm font-semibold text-[var(--color-ink)]">
                        {derivation.title}
                      </h4>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-mono text-[var(--color-ink-muted)]">
                      {derivation.steps.length} steps
                    </span>
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        handleAskAiDerivation(derivation);
                      }}
                      className="p-1.5 rounded-lg border border-[var(--color-rule)] text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors"
                      title="Explain this derivation with AI"
                    >
                      <Sparkles size={14} />
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="p-4 flex flex-col gap-4">
                    <p className="text-xs text-[var(--color-ink-muted)] italic">
                      Problem Statement: {derivation.problemStatement}
                    </p>

                    {derivation.initialAssumptions.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {derivation.initialAssumptions.map((assump, aIdx) => (
                          <span
                            key={aIdx}
                            className="px-2 py-0.5 rounded text-[0.6875rem] font-mono bg-[var(--color-paper)] border border-[var(--color-rule)] text-[var(--color-ink-muted)]"
                          >
                            Assumption: {assump}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex flex-col gap-3">
                      {derivation.steps.map((step, sIdx) => (
                        <div
                          key={sIdx}
                          draggable={true}
                          onDragStart={e => {
                            const ctx: AssistantContextObject = {
                              type: 'artifact',
                              id: `derivation-step-${unit.id}-${derivation.id}-${step.stepIndex}`,
                              label: `Step ${step.stepIndex}: ${step.label || 'Derivation Step'}`,
                              secondaryLabel: derivation.title,
                              metadata: {
                                mathExpression: step.mathExpression,
                                justification: step.justification || ''
                              }
                            };
                            e.dataTransfer.setData('application/json', JSON.stringify(ctx));
                            e.dataTransfer.setData(
                              'text/plain',
                              `Step ${step.stepIndex}: ${step.mathExpression}\nJustification: ${step.justification || ''}`
                            );
                          }}
                          className="p-3.5 rounded-xl border border-[var(--color-rule)] bg-[var(--color-paper)] flex flex-col gap-2 shadow-2xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[0.7188rem] font-mono font-bold text-amber-600 dark:text-amber-400">
                              Step {step.stepIndex}: {step.label || step.justification}
                            </span>
                            <span className="text-[0.625rem] font-mono text-slate-400 flex items-center gap-0.5">
                              <Move size={9} className="text-amber-500" />
                              <span>Drag step</span>
                            </span>
                          </div>

                          <div className="p-2.5 rounded-lg bg-[var(--color-surface)] border border-[var(--color-rule)]">
                            <MathView
                              math={step.mathExpression}
                              block={true}
                              label={`Step ${step.stepIndex}`}
                              contextId={`step-${derivation.id}-${step.stepIndex}`}
                            />
                          </div>

                          {step.justification && (
                            <p className="text-[0.7188rem] text-[var(--color-ink-muted)] leading-relaxed">
                              {step.justification}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="p-3 rounded-lg bg-emerald-50/20 dark:bg-emerald-950/10 border border-emerald-500/40 text-xs text-[var(--color-ink)] flex items-start gap-2">
                      <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                      <div>
                        <strong className="font-semibold text-emerald-600 dark:text-emerald-400 font-mono">
                          Derivation Conclusion:{' '}
                        </strong>
                        {derivation.conclusion}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Practice Calculation Challenges */}
      {unit.applying.practiceChallenges.length > 0 && (
        <div className="flex flex-col gap-3 pt-4 border-t border-[var(--color-rule)]">
          <h3 className="text-xs font-mono uppercase tracking-wider text-[var(--color-ink-muted)] flex items-center gap-1.5">
            <Calculator size={14} className="text-amber-500" />
            <span>Practice Calculation Challenges ({unit.applying.practiceChallenges.length})</span>
          </h3>

          <div className="flex flex-col gap-4">
            {unit.applying.practiceChallenges.map((challenge, cIdx) => {
              const isSolved = solvedChallenges[challenge.id] ?? false;
              const isSolutionRevealed = revealedSolutions[challenge.id] ?? false;

              return (
                <div
                  key={challenge.id || cIdx}
                  draggable={true}
                  onDragStart={e => {
                    const ctx: AssistantContextObject = {
                      type: 'artifact',
                      id: `challenge-${unit.id}-${challenge.id}`,
                      label: challenge.question.slice(0, 45) + '...',
                      secondaryLabel: `Practice Challenge: ${unit.title}`,
                      metadata: {
                        question: challenge.question,
                        mathContext: challenge.mathContext || '',
                        hints: (challenge.hints || []).join('; ')
                      }
                    };
                    e.dataTransfer.setData('application/json', JSON.stringify(ctx));
                    e.dataTransfer.setData(
                      'text/plain',
                      `Practice Challenge: ${challenge.question}\nContext: ${challenge.mathContext || ''}\nSolution: ${challenge.solutionWalkthrough}`
                    );
                  }}
                  className={`p-4 md:p-5 rounded-2xl border transition-all ${
                    isSolved
                      ? 'border-amber-500/50 bg-amber-50/15 dark:bg-amber-950/10'
                      : 'border-[var(--color-rule)] bg-[var(--color-surface)] hover:border-amber-400/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-[0.625rem] font-mono text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                          Challenge 0{cIdx + 1}
                        </span>
                        <span className="text-[0.625rem] font-mono text-slate-400 flex items-center gap-0.5">
                          <Move size={9} className="text-amber-500" />
                          <span>Drag to AI</span>
                        </span>
                      </div>
                      <h4 className="text-xs md:text-sm font-semibold text-[var(--color-ink)] leading-snug">
                        {challenge.question}
                      </h4>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleAskAiChallenge(challenge)}
                        className="p-1.5 rounded-lg border border-[var(--color-rule)] text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors"
                        title="Work on this challenge with AI"
                      >
                        <Sparkles size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleSolveChallenge(challenge.id)}
                        className={`p-1.5 rounded-lg text-xs flex items-center gap-1 font-mono transition-colors ${
                          isSolved
                            ? 'bg-amber-500 text-white'
                            : 'border border-[var(--color-rule)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
                        }`}
                      >
                        <CheckCircle2 size={14} />
                        <span>{isSolved ? 'Completed' : 'Mark Solved'}</span>
                      </button>
                    </div>
                  </div>

                  {challenge.mathContext && (
                    <div className="p-3 my-2.5 rounded-xl bg-[var(--color-paper)] border border-[var(--color-rule)]">
                      <MathView
                        math={challenge.mathContext}
                        block={false}
                        label={`Context 0${cIdx + 1}`}
                        contextId={`challenge-ctx-${challenge.id}`}
                      />
                    </div>
                  )}

                  {/* Hints */}
                  {challenge.hints && challenge.hints.length > 0 && (
                    <div className="flex flex-wrap gap-2 my-2">
                      {challenge.hints.map((hint, hIdx) => (
                        <span
                          key={hIdx}
                          className="px-2 py-0.5 rounded text-xs font-mono bg-[var(--color-paper)] border border-[var(--color-rule)] text-[var(--color-ink-muted)]"
                        >
                          Hint {hIdx + 1}: {hint}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Solution Reveal & Steps */}
                  <div className="mt-3 pt-3 border-t border-[var(--color-rule)]/60 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() =>
                          setRevealedSolutions(prev => ({ ...prev, [challenge.id]: !prev[challenge.id] }))
                        }
                        className="text-xs font-mono text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
                      >
                        {isSolutionRevealed ? <EyeOff size={13} /> : <Eye size={13} />}
                        <span>{isSolutionRevealed ? 'Hide Solution' : 'Reveal Step-by-Step Solution'}</span>
                      </button>
                    </div>

                    {isSolutionRevealed && (
                      <div className="p-3.5 rounded-lg bg-[var(--color-paper)] border border-[var(--color-rule)] flex flex-col gap-2.5 animate-fadeIn">
                        <div className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400">
                          Solution Walkthrough:
                        </div>
                        <p className="text-xs text-[var(--color-ink)] leading-relaxed whitespace-pre-line">
                          {challenge.solutionWalkthrough}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
