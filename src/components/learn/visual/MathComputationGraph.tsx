import React, { useState, useMemo } from 'react';
import {
  Layers,
  ArrowRight,
  Sparkles,
  Info,
  Maximize2,
  CheckCircle2,
  AlertTriangle,
  Move,
  BookOpen,
  Cpu,
  CornerDownRight,
  GitBranch
} from 'lucide-react';
import { LearningUnit } from '../../../learnTypes';
import { MathView } from '../../common/MathView';
import { useWorkspace } from '../../../context/WorkspaceContext';
import { AssistantContextObject } from '../../../types';

interface MathComputationGraphProps {
  unit: LearningUnit;
}

interface ComputationNode {
  id: string;
  stepNumber: number;
  label: string;
  category: 'input' | 'transform' | 'normalization' | 'reduction' | 'output';
  formulaLatex: string;
  inputShape?: string;
  outputShape?: string;
  description: string;
  invariant?: string;
  potentialFailureMode?: string;
  aiPrompt: string;
}

export const MathComputationGraph: React.FC<MathComputationGraphProps> = ({ unit }) => {
  const { addAttachedContext, setIsDockOpen, sendAssistantMessage } = useWorkspace();
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'flow' | 'tensors' | 'invariants'>('flow');

  // Derive computation pipeline steps based on unit data
  const pipelineNodes: ComputationNode[] = useMemo(() => {
    // 1. If unit is Softmax Attention
    if (unit.id === 'unit-softmax-attention' || unit.title.toLowerCase().includes('attention')) {
      return [
        {
          id: 'step-inputs',
          stepNumber: 1,
          label: 'Query & Key Projections',
          category: 'input',
          formulaLatex: 'q \\in \\mathbb{R}^{d_k}, \\quad K \\in \\mathbb{R}^{N \\times d_k}',
          inputShape: '[N, d_model]',
          outputShape: 'q: [1, d_k], K: [N, d_k]',
          description: 'Linear projections of embeddings into dedicated semantic matching subspaces with dimension d_k.',
          invariant: 'Subspaces allow orthogonal representations of syntactic vs semantic roles.',
          potentialFailureMode: 'Rank collapse if projection matrices are initialized with degenerated singular values.',
          aiPrompt: 'Explain how Query and Key projection matrices transform token embeddings into inner product spaces for attention.'
        },
        {
          id: 'step-bilinear',
          stepNumber: 2,
          label: 'Bilinear Inner Product Pairing',
          category: 'transform',
          formulaLatex: 'S = q K^T = [q^T k_1, \\dots, q^T k_N]',
          inputShape: 'q: [1, d_k], K: [N, d_k]',
          outputShape: 'S: [1, N]',
          description: 'Calculates directional cosine alignment multiplied by vector norms across all sequence keys.',
          invariant: 'Pairing is linear with respect to both query and keys.',
          potentialFailureMode: 'Variance scales proportionally with dimension d_k: Var(q^T k) = d_k, causing logits to diverge.',
          aiPrompt: 'Derive why the variance of the dot product between two independent d_k-dimensional vectors grows linearly with d_k.'
        },
        {
          id: 'step-scale',
          stepNumber: 3,
          label: 'Temperature & Variance Scaling',
          category: 'normalization',
          formulaLatex: 'Z = \\frac{S}{\\sqrt{d_k}} = \\tau^{-1} S',
          inputShape: 'S: [1, N]',
          outputShape: 'Z: [1, N]',
          description: 'Scalar scaling factor tau = sqrt(d_k) divides logits to restore unit variance Var(Z) = 1.',
          invariant: 'Normalizes dynamic range regardless of projection head size (e.g. 64 or 128).',
          potentialFailureMode: 'Omitting sqrt(d_k) pushes logits into extreme regimes where softmax gradients exponentially vanish.',
          aiPrompt: 'Why does dividing by sqrt(d_k) prevent the softmax gradient from vanishing in Transformer self-attention?'
        },
        {
          id: 'step-exp-partition',
          stepNumber: 4,
          label: 'Exponential Map & Simplex Projection',
          category: 'normalization',
          formulaLatex: 'a_i = \\frac{\\exp(Z_i)}{\\sum_{j=1}^N \\exp(Z_j)} \\in \\Delta^{N-1}',
          inputShape: 'Z: [1, N]',
          outputShape: 'a: [1, N], \\sum a_i = 1',
          description: 'Maps real unconstrained logits to a probability distribution over the standard simplex Delta^{N-1}.',
          invariant: 'Strict conservation: sum of attention weights across all tokens equals exactly 1.0, a_i > 0.',
          potentialFailureMode: 'Attention sink: unneeded tokens still soak up mass because total probability cannot sum to zero.',
          aiPrompt: 'Explain the geometry of the probability simplex in softmax attention and how it forces the emergence of attention sinks.'
        },
        {
          id: 'step-context',
          stepNumber: 5,
          label: 'Contextual Representation Synthesis',
          category: 'output',
          formulaLatex: '\\text{Context} = \\sum_{i=1}^N a_i v_i = a V',
          inputShape: 'a: [1, N], V: [N, d_v]',
          outputShape: 'Context: [1, d_v]',
          description: 'Convex combination of value vectors weighted by normalized relevance probabilities.',
          invariant: 'Output lies inside the convex hull formed by row vectors of V.',
          potentialFailureMode: 'Smoothing out crucial distinct details if attention distribution is overly entropic/uniform.',
          aiPrompt: 'How does the convex combination of value vectors preserve semantic representations in multi-head attention?'
        }
      ];
    }

    // 2. If unit is LoRA
    if (unit.id.includes('lora') || unit.title.toLowerCase().includes('lora')) {
      return [
        {
          id: 'step-frozen-base',
          stepNumber: 1,
          label: 'Pre-trained Weight Forward',
          category: 'input',
          formulaLatex: 'h_0 = W_0 x, \\quad W_0 \\in \\mathbb{R}^{d \\times k}',
          inputShape: 'x: [d, 1]',
          outputShape: 'h_0: [k, 1]',
          description: 'Frozen base model parameters that remain untouched throughout fine-tuning.',
          invariant: 'Base model representations remain preserved and stable.',
          potentialFailureMode: 'Catastrophic forgetting avoided by keeping W_0 completely immutable.',
          aiPrompt: 'Why does low-rank adaptation keep pre-trained weights frozen rather than updating them with small learning rates?'
        },
        {
          id: 'step-down-proj',
          stepNumber: 2,
          label: 'Low-Rank Bottleneck Compression',
          category: 'transform',
          formulaLatex: 'z = A x, \\quad A \\in \\mathbb{R}^{r \\times k} \\sim \\mathcal{N}(0, \\sigma^2)',
          inputShape: 'x: [k, 1]',
          outputShape: 'z: [r, 1], \\quad r \\ll \\min(d, k)',
          description: 'Compresses input representation down to intrinsic rank r (e.g. r=8 or 16).',
          invariant: 'Parameter count reduced from d*k down to r*(d+k).',
          potentialFailureMode: 'Selecting rank r smaller than intrinsic task dimensionality leads to underfitting.',
          aiPrompt: 'How do we determine the intrinsic rank r of task adaptation matrices in LoRA?'
        },
        {
          id: 'step-up-proj',
          stepNumber: 3,
          label: 'Subspace Expansion',
          category: 'transform',
          formulaLatex: '\\Delta h = B z = B A x, \\quad B \\in \\mathbb{R}^{d \\times r} = 0',
          inputShape: 'z: [r, 1]',
          outputShape: '\\Delta h: [d, 1]',
          description: 'Expands low-rank features back into the full output dimension. Initialized to zero so Delta W = 0 at start.',
          invariant: 'Identity initialization: at step 0, Delta W = 0, model output is identically the base model.',
          potentialFailureMode: 'If B is not initialized to zero, initial forward pass disrupts pre-trained capabilities.',
          aiPrompt: 'Why must matrix B in LoRA be initialized to zeros while matrix A is initialized with Gaussian noise?'
        },
        {
          id: 'step-scaling-combine',
          stepNumber: 4,
          label: 'Alpha Scaling & Residual Addition',
          category: 'output',
          formulaLatex: 'h = W_0 x + \\frac{\\alpha}{r} B A x',
          inputShape: 'h_0: [d, 1], \\Delta h: [d, 1]',
          outputShape: 'h: [d, 1]',
          description: 'Residual combination scaled by alpha / r constant to stabilize learning rate across varying ranks.',
          invariant: 'Scaling alpha / r makes tuning rank r mostly independent of learning rate choice.',
          potentialFailureMode: 'Inconsistent alpha scaling requires retuning optimizer hyperparameters when changing rank.',
          aiPrompt: 'Explain the mathematical purpose of the alpha/r scaling factor in LoRA.'
        }
      ];
    }

    // 3. Fallback: synthesize from unit.understanding and structuralComponents
    const decomposition = unit.understanding.conceptDecomposition;
    const structural = unit.analyzing.structuralComponents;

    if (structural && structural.length > 0) {
      return structural.map((comp, idx) => ({
        id: `step-${comp.id || idx}`,
        stepNumber: idx + 1,
        label: comp.component,
        category: idx === 0 ? 'input' : idx === structural.length - 1 ? 'output' : 'transform',
        formulaLatex: comp.formulaSnippet,
        description: comp.mathematicalFunction,
        invariant: comp.invariantPreserved,
        aiPrompt: `Explain the mathematical function and invariants of ${comp.component}: ${comp.formulaSnippet}`
      }));
    }

    if (decomposition && decomposition.length > 0) {
      return decomposition.map((dec, idx) => ({
        id: `step-dec-${idx}`,
        stepNumber: idx + 1,
        label: dec.part,
        category: idx === 0 ? 'input' : idx === decomposition.length - 1 ? 'output' : 'transform',
        formulaLatex: unit.understanding.formalDefinition.statement.slice(0, 50),
        description: dec.role,
        potentialFailureMode: dec.impactIfMissing,
        aiPrompt: `Explain how the component "${dec.part}" functions in ${unit.title} and why it is critical.`
      }));
    }

    // Default 3-node fallback
    return [
      {
        id: 'step-def-1',
        stepNumber: 1,
        label: 'Domain & Inputs',
        category: 'input',
        formulaLatex: unit.understanding.formalDefinition.notationKey[0]?.symbol || 'x \\in \\mathcal{X}',
        description: 'Input domain and operational preconditions.',
        aiPrompt: `Analyze the input preconditions for ${unit.title}.`
      },
      {
        id: 'step-def-2',
        stepNumber: 2,
        label: 'Core Transformation',
        category: 'transform',
        formulaLatex: unit.understanding.formalDefinition.statement,
        description: 'Primary mathematical transformation mapping input to target manifold.',
        aiPrompt: `Step-by-step mathematical derivation of ${unit.title}.`
      },
      {
        id: 'step-def-3',
        stepNumber: 3,
        label: 'Conserved Property & Output',
        category: 'output',
        formulaLatex: '\\mathcal{Y} = f(\\mathcal{X})',
        description: 'Output representation preserving structural mathematical invariants.',
        aiPrompt: `What mathematical invariants are preserved in ${unit.title}?`
      }
    ];
  }, [unit]);

  const selectedNode = useMemo(() => {
    if (!selectedNodeId) return pipelineNodes[0];
    return pipelineNodes.find(n => n.id === selectedNodeId) || pipelineNodes[0];
  }, [selectedNodeId, pipelineNodes]);

  const handleAskAiAboutNode = (node: ComputationNode) => {
    setIsDockOpen(true);
    const contextObject: AssistantContextObject = {
      type: 'artifact',
      id: `node-${node.id}`,
      label: `${node.stepNumber}. ${node.label}`,
      secondaryLabel: 'Computation Pipeline Node',
      metadata: {
        formula: node.formulaLatex,
        description: node.description,
        invariant: node.invariant || ''
      }
    };
    addAttachedContext(contextObject);
  };

  return (
    <div className="flex flex-col gap-5 w-full">
      {/* Visual Header & Mode Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-rule)] pb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-500 flex items-center justify-center">
            <Cpu size={15} />
          </div>
          <div>
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--color-ink)]">
              Mathematical Computation Pipeline (DAG)
            </h3>
            <p className="text-[0.6875rem] text-[var(--color-ink-muted)]">
              Interactive dataflow graph showing how tensors, matrices, and operators compose into the final result.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-[var(--color-surface)] p-1 rounded-lg border border-[var(--color-rule)] text-xs font-mono">
          <button
            type="button"
            onClick={() => setActiveTab('flow')}
            className={`px-2.5 py-1 rounded transition-colors ${
              activeTab === 'flow'
                ? 'bg-sky-500 text-white font-semibold shadow-2xs'
                : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
            }`}
          >
            Dataflow Steps
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('tensors')}
            className={`px-2.5 py-1 rounded transition-colors ${
              activeTab === 'tensors'
                ? 'bg-sky-500 text-white font-semibold shadow-2xs'
                : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
            }`}
          >
            Tensor Shapes
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('invariants')}
            className={`px-2.5 py-1 rounded transition-colors ${
              activeTab === 'invariants'
                ? 'bg-sky-500 text-white font-semibold shadow-2xs'
                : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
            }`}
          >
            Invariants & Bounds
          </button>
        </div>
      </div>

      {/* COMPUTATIONAL GRAPH HORIZONTAL FLOW / PIPELINE */}
      <div className="relative w-full overflow-x-auto pb-4 pt-2">
        <div className="flex items-stretch gap-3 min-w-max">
          {pipelineNodes.map((node, idx) => {
            const isSelected = selectedNode.id === node.id;
            return (
              <React.Fragment key={node.id}>
                {/* Node Card */}
                <div
                  draggable={true}
                  onDragStart={e => {
                    const ctx: AssistantContextObject = {
                      type: 'artifact',
                      id: `node-${node.id}`,
                      label: `${node.stepNumber}. ${node.label}`,
                      secondaryLabel: 'DAG Pipeline Node',
                      metadata: {
                        formula: node.formulaLatex,
                        description: node.description,
                        invariant: node.invariant || ''
                      }
                    };
                    e.dataTransfer.setData('application/json', JSON.stringify(ctx));
                    e.dataTransfer.setData('text/plain', `Node: ${node.label}\nFormula: ${node.formulaLatex}\n${node.description}`);
                  }}
                  onClick={() => setSelectedNodeId(node.id)}
                  className={`w-64 p-4 rounded-xl border transition-all cursor-pointer select-none flex flex-col justify-between group ${
                    isSelected
                      ? 'border-sky-500 bg-sky-500/5 dark:bg-sky-950/20 ring-2 ring-sky-500/20 shadow-md'
                      : 'border-[var(--color-rule)] bg-[var(--color-paper)] hover:border-sky-400/50 hover:bg-[var(--color-surface)]'
                  }`}
                >
                  <div className="flex flex-col gap-2">
                    {/* Node Badge & Drag Indicator */}
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/30 flex items-center justify-center font-mono text-[0.625rem] font-bold">
                          {node.stepNumber}
                        </span>
                        <span className="text-[0.625rem] font-mono uppercase tracking-wider text-[var(--color-ink-muted)]">
                          {node.category}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 text-[var(--color-ink-muted)] opacity-60 group-hover:opacity-100 transition-opacity">
                        <span title="Drag to AI Assistant">
                          <Move size={11} />
                        </span>
                      </div>
                    </div>

                    {/* Node Label */}
                    <h4 className="text-xs font-bold text-[var(--color-ink)] leading-snug">
                      {node.label}
                    </h4>

                    {/* Formula Rendered in KaTeX */}
                    <div className="py-2 px-2.5 rounded-lg bg-[var(--color-surface)] border border-[var(--color-rule)] font-serif text-xs text-sky-600 dark:text-sky-400 overflow-x-auto text-center">
                      <MathView
                        math={node.formulaLatex}
                        block={false}
                        draggable={false}
                        showAiAction={false}
                      />
                    </div>

                    {/* Tensor Dimension Chip */}
                    {node.outputShape && (
                      <div className="flex items-center gap-1.5 font-mono text-[0.625rem] text-[var(--color-ink-muted)]">
                        <span className="text-slate-400">Dim:</span>
                        <code className="px-1.5 py-0.5 rounded bg-[var(--color-surface)] border border-[var(--color-rule)] text-[var(--color-ink)]">
                          {node.outputShape}
                        </code>
                      </div>
                    )}
                  </div>

                  {/* Node Footer Actions */}
                  <div className="mt-3 pt-2.5 border-t border-[var(--color-rule)]/50 flex items-center justify-between">
                    <span className="text-[0.625rem] font-mono text-sky-600 dark:text-sky-400 font-medium">
                      {isSelected ? 'Selected' : 'Inspect'}
                    </span>
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        handleAskAiAboutNode(node);
                      }}
                      className="px-2 py-0.5 rounded text-[0.625rem] font-mono flex items-center gap-1 text-slate-500 hover:text-sky-500 hover:bg-sky-50 dark:hover:bg-sky-950/40 transition-colors"
                      title="Ask AI to explain this step"
                    >
                      <Sparkles size={11} />
                      <span>AI Query</span>
                    </button>
                  </div>
                </div>

                {/* Connecting Arrow */}
                {idx < pipelineNodes.length - 1 && (
                  <div className="flex items-center justify-center px-1 text-slate-400 dark:text-slate-600 shrink-0">
                    <div className="flex flex-col items-center">
                      <ArrowRight size={18} className="text-sky-500/70" />
                      <span className="text-[0.5625rem] font-mono text-slate-400">tensor</span>
                    </div>
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* SELECTED NODE INSPECTOR PANEL */}
      {selectedNode && (
        <div className="p-5 rounded-2xl border border-sky-500/40 bg-[var(--color-paper)] shadow-sm flex flex-col gap-4 animate-in fade-in duration-200">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--color-rule)] pb-3">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-xl bg-sky-500 text-white font-mono text-sm font-bold flex items-center justify-center shadow-xs">
                {selectedNode.stepNumber}
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[0.6875rem] font-mono uppercase tracking-wider text-sky-600 dark:text-sky-400 font-semibold">
                    Step {selectedNode.stepNumber} • {selectedNode.category}
                  </span>
                  {selectedNode.outputShape && (
                    <span className="px-2 py-0.5 rounded bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 font-mono text-[0.6875rem]">
                      {selectedNode.outputShape}
                    </span>
                  )}
                </div>
                <h4 className="text-sm font-bold text-[var(--color-ink)] mt-0.5">
                  {selectedNode.label}
                </h4>
              </div>
            </div>

            {/* Direct AI Action Button */}
            <button
              type="button"
              onClick={() => handleAskAiAboutNode(selectedNode)}
              className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-mono font-medium flex items-center gap-1.5 shadow-xs transition-all"
            >
              <Sparkles size={13} />
              <span>Discuss Step with AI</span>
            </button>
          </div>

          {/* KaTeX Block Equation */}
          <div className="p-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-rule)]">
            <MathView
              math={selectedNode.formulaLatex}
              block={true}
              label={`Formula for ${selectedNode.label}`}
              description={selectedNode.description}
              contextId={`formula-${selectedNode.id}`}
            />
          </div>

          {/* Invariant & Failure Mode Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {selectedNode.invariant && (
              <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-50/20 dark:bg-emerald-950/20 flex flex-col gap-1.5">
                <div className="flex items-center gap-1.5 text-xs font-mono font-semibold text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 size={14} />
                  <span>Mathematical Invariant Preserved</span>
                </div>
                <p className="text-xs text-[var(--color-ink)] leading-relaxed">
                  {selectedNode.invariant}
                </p>
              </div>
            )}

            {selectedNode.potentialFailureMode && (
              <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-50/20 dark:bg-amber-950/20 flex flex-col gap-1.5">
                <div className="flex items-center gap-1.5 text-xs font-mono font-semibold text-amber-700 dark:text-amber-400">
                  <AlertTriangle size={14} />
                  <span>Failure Mode / Numerical Instability</span>
                </div>
                <p className="text-xs text-[var(--color-ink)] leading-relaxed">
                  {selectedNode.potentialFailureMode}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
