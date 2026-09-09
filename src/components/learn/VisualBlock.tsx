import React, { useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Boxes,
  Brain,
  Check,
  CircleHelp,
  Code2,
  Copy,
  Eye,
  EyeOff,
  FileQuestion,
  GitBranch,
  GripVertical,
  Image as ImageIcon,
  Layers3,
  Lightbulb,
  ListPlus,
  Network,
  Plus,
  RotateCcw,
  Rows3,
  Sigma,
  Sparkles,
  Trash2,
  X
} from 'lucide-react';
import {
  CardBlock,
  CodeBlock,
  COGNITIVE_LEVELS,
  DerivationBlock,
  DerivationStep,
  GraphBlock,
  ImageBlock,
  LearnBlock,
  LearnBlockKind,
  NoteBlock,
  TableBlock,
  TensorBlock,
  TensorOpRow,
  TreeBlock,
  TreeNode
} from '../../learnTypes';
import { MathView } from '../common/MathView';

interface VisualBlockProps {
  block: LearnBlock;
  index: number;
  count: number;
  onUpdate: (updates: Partial<LearnBlock>) => void;
  onDelete: () => void;
  onMove: (direction: -1 | 1) => void;
  onReview: (recalled: boolean) => void;
  onPromote: (kind: 'claim' | 'question' | 'task', text: string) => void;
}

const inputClass = 'w-full rounded-lg border border-[var(--color-rule)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-muted)]/60';
const smallInputClass = 'min-w-0 flex-1 rounded-md border border-[var(--color-rule)] bg-[var(--color-surface)] px-2 py-1.5 text-xs text-[var(--color-ink)]';

export const BLOCK_META: Record<LearnBlockKind, { label: string; hint: string; icon: React.ComponentType<{ size?: number }> }> = {
  derivation: { label: 'Derivation', hint: 'Step-by-step math with self-test recall mode', icon: Sigma },
  tensor: { label: 'Tensor flow', hint: 'Layer dimensions, shapes, and weights', icon: Boxes },
  code: { label: 'PyTorch / Code', hint: 'Implementation & tensor manipulation snippet', icon: Code2 },
  card: { label: 'Recall card', hint: 'Question on front, answer on back', icon: Brain },
  note: { label: 'Note + math', hint: 'Explain, derive, critique, invent', icon: Lightbulb },
  image: { label: 'Screenshot', hint: 'Paste a figure and annotate it', icon: ImageIcon },
  table: { label: 'Table', hint: 'Compare cases, criteria, or steps', icon: Rows3 },
  tree: { label: 'Tree', hint: 'Decompose a concept into parts', icon: GitBranch },
  graph: { label: 'Graph', hint: 'Map relationships and mechanisms', icon: Network }
};

export const VisualBlock: React.FC<VisualBlockProps> = ({
  block,
  index,
  count,
  onUpdate,
  onDelete,
  onMove,
  onReview,
  onPromote
}) => {
  const meta = COGNITIVE_LEVELS[block.level];
  const blockMeta = BLOCK_META[block.kind];
  const Icon = blockMeta.icon;
  const promotableText = getBlockText(block);

  return (
    <article
      id={`learn-block-${block.id}`}
      className="group relative rounded-2xl border border-[var(--color-rule)] bg-[var(--color-paper)] shadow-xs transition-shadow hover:shadow-md"
    >
      <div className={`absolute inset-y-0 left-0 w-1 rounded-l-2xl ${meta.dotClass}`} />
      <header className="flex items-center gap-2 border-b border-[var(--color-rule)] px-4 py-2.5 pl-5">
        <GripVertical size={14} className="text-[var(--color-ink-muted)]/50" aria-hidden="true" />
        <Icon size={14} />
        <span className="text-xs font-semibold text-[var(--color-ink)]">{blockMeta.label}</span>
        <span className={`rounded-full border px-2 py-0.5 text-[0.6875rem] font-mono ${meta.badgeClass}`}>
          L{meta.levelNumber} {meta.name}
        </span>
        <input
          value={block.locator || ''}
          onChange={event => onUpdate({ locator: event.target.value })}
          aria-label="Source location"
          placeholder="p. 184 / 14:32"
          className="ml-auto w-28 border-0 bg-transparent text-right text-[0.6875rem] font-mono text-[var(--color-ink-muted)] outline-none placeholder:text-[var(--color-ink-muted)]/50"
        />
        <button type="button" onClick={() => onMove(-1)} disabled={index === 0} aria-label="Move block up" className="p-1 text-[var(--color-ink-muted)] disabled:opacity-20 hover:text-[var(--color-ink)]">
          <ArrowUp size={13} />
        </button>
        <button type="button" onClick={() => onMove(1)} disabled={index === count - 1} aria-label="Move block down" className="p-1 text-[var(--color-ink-muted)] disabled:opacity-20 hover:text-[var(--color-ink)]">
          <ArrowDown size={13} />
        </button>
        <button
          type="button"
          onClick={() => window.confirm('Delete this learning block?') && onDelete()}
          aria-label="Delete block"
          className="p-1 text-[var(--color-ink-muted)] hover:text-rose-600"
        >
          <Trash2 size={13} />
        </button>
      </header>

      <div className="p-4 pl-5">
        {block.kind === 'card' && <CardEditor block={block} onUpdate={onUpdate} onReview={onReview} />}
        {block.kind === 'note' && <NoteEditor block={block} onUpdate={onUpdate} />}
        {block.kind === 'image' && <ImageEditor block={block} onUpdate={onUpdate} />}
        {block.kind === 'table' && <TableEditor block={block} onUpdate={onUpdate} />}
        {block.kind === 'tree' && <TreeEditor block={block} onUpdate={onUpdate} />}
        {block.kind === 'graph' && <GraphEditor block={block} onUpdate={onUpdate} />}
        {block.kind === 'derivation' && <DerivationEditor block={block} onUpdate={onUpdate} />}
        {block.kind === 'tensor' && <TensorEditor block={block} onUpdate={onUpdate} />}
        {block.kind === 'code' && <CodeEditor block={block} onUpdate={onUpdate} />}
      </div>

      {promotableText && (
        <footer className="flex flex-wrap items-center gap-1.5 border-t border-[var(--color-rule)] px-4 py-2 pl-5 text-[0.6875rem]">
          <span className="mr-1 font-mono uppercase tracking-wider text-[var(--color-ink-muted)]">Use in research</span>
          <PromoteButton
            icon={Check}
            label={block.promotedClaimId ? 'Claim linked' : 'Make claim'}
            active={Boolean(block.promotedClaimId)}
            onClick={() => onPromote('claim', promotableText)}
          />
          <PromoteButton
            icon={FileQuestion}
            label={block.promotedQuestionId ? 'Question linked' : 'Make question'}
            active={Boolean(block.promotedQuestionId)}
            onClick={() => onPromote('question', promotableText)}
          />
          <PromoteButton
            icon={Sparkles}
            label={block.promotedTaskId ? 'Task linked' : 'Make task'}
            active={Boolean(block.promotedTaskId)}
            onClick={() => onPromote('task', promotableText)}
          />
        </footer>
      )}
    </article>
  );
};

const PromoteButton: React.FC<{
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  active: boolean;
  onClick: () => void;
}> = ({ icon: Icon, label, active, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={active}
    className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 transition-colors ${active
      ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
      : 'border-[var(--color-rule)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'}`}
  >
    <Icon size={11} /> {label}
  </button>
);

const CardEditor: React.FC<{ block: CardBlock; onUpdate: (updates: Partial<LearnBlock>) => void; onReview: (recalled: boolean) => void }> = ({ block, onUpdate, onReview }) => {
  const [showAnswer, setShowAnswer] = useState(false);
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <label className="space-y-1.5">
        <span className="text-xs font-medium text-[var(--color-ink-muted)]">Prompt</span>
        <textarea value={block.front} onChange={event => onUpdate({ front: event.target.value })} rows={4} placeholder="What should future-you recall?" className={inputClass} />
      </label>
      <div className="space-y-1.5">
        <span className="text-xs font-medium text-[var(--color-ink-muted)]">Answer</span>
        <button
          type="button"
          onClick={() => setShowAnswer(current => !current)}
          className="min-h-28 w-full rounded-xl border border-dashed border-[var(--color-rule)] bg-[var(--color-surface)] p-4 text-left text-sm"
        >
          {showAnswer ? (block.back || 'Write the answer below.') : <span className="flex items-center justify-center gap-2 text-[var(--color-ink-muted)]"><RotateCcw size={15} /> Reveal answer</span>}
        </button>
        <textarea value={block.back} onChange={event => onUpdate({ back: event.target.value })} rows={3} placeholder="Precise answer, in your own words" className={inputClass} />
      </div>
      <label className="space-y-1.5 lg:col-span-2">
        <span className="text-xs font-medium text-[var(--color-ink-muted)]">Formula (optional LaTeX)</span>
        <input value={block.latex || ''} onChange={event => onUpdate({ latex: event.target.value })} placeholder="QK^T / \\sqrt{d_k}" className={inputClass} />
      </label>
      {block.latex && <MathView math={block.latex} block draggable={false} showAiAction={false} className="lg:col-span-2" />}
      <div className="flex flex-wrap items-center gap-2 lg:col-span-2">
        <span className="text-xs text-[var(--color-ink-muted)]">Review:</span>
        <button type="button" onClick={() => onReview(false)} className="rounded-lg border border-rose-300 px-3 py-1.5 text-xs text-rose-700 dark:border-rose-800 dark:text-rose-300">Again</button>
        <button type="button" onClick={() => onReview(true)} className="rounded-lg border border-emerald-300 px-3 py-1.5 text-xs text-emerald-700 dark:border-emerald-800 dark:text-emerald-300">Got it</button>
        <span className="ml-auto text-[0.6875rem] font-mono text-[var(--color-ink-muted)]">Box {block.box} · due {formatDue(block.dueAt)}</span>
      </div>
    </div>
  );
};

const NoteEditor: React.FC<{ block: NoteBlock; onUpdate: (updates: Partial<LearnBlock>) => void }> = ({ block, onUpdate }) => (
  <div className="space-y-3">
    <textarea value={block.text} onChange={event => onUpdate({ text: event.target.value })} rows={7} placeholder="Explain the mechanism, work an example, critique an assumption, or sketch a new idea…" className={inputClass} />
    <label className="space-y-1.5">
      <span className="text-xs font-medium text-[var(--color-ink-muted)]">Math (optional LaTeX)</span>
      <input value={block.latex || ''} onChange={event => onUpdate({ latex: event.target.value })} placeholder="Enter one equation" className={inputClass} />
    </label>
    {block.latex && <MathView math={block.latex} block draggable={false} showAiAction={false} />}
  </div>
);

const ImageEditor: React.FC<{ block: ImageBlock; onUpdate: (updates: Partial<LearnBlock>) => void }> = ({ block, onUpdate }) => {
  const readImage = (file?: File) => {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => onUpdate({ dataUrl: String(reader.result || '') });
    reader.readAsDataURL(file);
  };

  return (
    <div
      className="space-y-3"
      onPaste={event => readImage(Array.from(event.clipboardData.files).find(file => file.type.startsWith('image/')))}
    >
      {block.dataUrl ? (
        <div className="relative overflow-hidden rounded-xl border border-[var(--color-rule)] bg-[var(--color-surface)]">
          <img src={block.dataUrl} alt={block.caption || 'Learning screenshot'} className="max-h-[32rem] w-full object-contain" />
          <button type="button" onClick={() => onUpdate({ dataUrl: '' })} aria-label="Remove image" className="absolute right-2 top-2 rounded-lg bg-black/60 p-1.5 text-white"><X size={14} /></button>
        </div>
      ) : (
        <label className="flex min-h-44 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--color-rule)] bg-[var(--color-surface)] text-center text-[var(--color-ink-muted)] hover:border-indigo-400">
          <ImageIcon size={26} />
          <span className="text-sm font-medium text-[var(--color-ink)]">Paste or choose a screenshot</span>
          <span className="text-xs">Figures, diagrams, slides, handwritten work</span>
          <input type="file" accept="image/*" className="sr-only" onChange={event => readImage(event.target.files?.[0])} />
        </label>
      )}
      <textarea value={block.caption} onChange={event => onUpdate({ caption: event.target.value })} rows={3} placeholder="Annotate what matters. What should your eyes notice?" className={inputClass} />
    </div>
  );
};

const TableEditor: React.FC<{ block: TableBlock; onUpdate: (updates: Partial<LearnBlock>) => void }> = ({ block, onUpdate }) => {
  const setColumn = (columnIndex: number, value: string) => onUpdate({ columns: block.columns.map((column, index) => index === columnIndex ? value : column) });
  const setCell = (rowIndex: number, columnIndex: number, value: string) => onUpdate({
    rows: block.rows.map((row, index) => index === rowIndex ? row.map((cell, cellIndex) => cellIndex === columnIndex ? value : cell) : row)
  });

  return (
    <div className="space-y-3 overflow-x-auto">
      <input value={block.title} onChange={event => onUpdate({ title: event.target.value })} placeholder="Comparison or process title" className={inputClass} />
      <table className="w-full min-w-[34rem] border-collapse text-xs">
        <thead>
          <tr>
            {block.columns.map((column, columnIndex) => (
              <th key={columnIndex} className="border border-[var(--color-rule)] bg-[var(--color-surface)] p-1.5">
                <input value={column} onChange={event => setColumn(columnIndex, event.target.value)} aria-label={`Column ${columnIndex + 1}`} className="w-full bg-transparent font-semibold outline-none" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {block.rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {block.columns.map((_, columnIndex) => (
                <td key={columnIndex} className="border border-[var(--color-rule)] p-1.5 align-top">
                  <textarea value={row[columnIndex] || ''} onChange={event => setCell(rowIndex, columnIndex, event.target.value)} aria-label={`Row ${rowIndex + 1}, column ${columnIndex + 1}`} rows={2} className="w-full resize-y bg-transparent outline-none" />
                </td>
              ))}
              <td className="w-8 border-0 pl-1">
                <button type="button" onClick={() => onUpdate({ rows: block.rows.filter((_, index) => index !== rowIndex) })} aria-label={`Delete row ${rowIndex + 1}`} className="p-1 text-[var(--color-ink-muted)] hover:text-rose-600"><X size={12} /></button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex gap-2">
        <button type="button" onClick={() => onUpdate({ rows: [...block.rows, block.columns.map(() => '')] })} className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs"><ListPlus size={13} /> Add row</button>
        <button type="button" onClick={() => onUpdate({ columns: [...block.columns, 'New column'], rows: block.rows.map(row => [...row, '']) })} className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs"><Plus size={13} /> Add column</button>
      </div>
    </div>
  );
};

const TreeEditor: React.FC<{ block: TreeBlock; onUpdate: (updates: Partial<LearnBlock>) => void }> = ({ block, onUpdate }) => {
  const rootNodes = block.nodes.filter(node => node.parentId === null);
  const updateNode = (nodeId: string, updates: Partial<TreeNode>) => onUpdate({ nodes: block.nodes.map(node => node.id === nodeId ? { ...node, ...updates } : node) });
  const removeNode = (nodeId: string) => {
    const removed = new Set([nodeId]);
    let foundChild = true;
    while (foundChild) {
      foundChild = false;
      for (const node of block.nodes) {
        if (node.parentId && removed.has(node.parentId) && !removed.has(node.id)) {
          removed.add(node.id);
          foundChild = true;
        }
      }
    }
    onUpdate({ nodes: block.nodes.filter(node => !removed.has(node.id)) });
  };

  return (
    <div className="space-y-4">
      <input value={block.title} onChange={event => onUpdate({ title: event.target.value })} placeholder="Concept to decompose" className={inputClass} />
      <div className="overflow-x-auto rounded-xl border border-[var(--color-rule)] bg-[var(--color-surface)] p-4">
        <div className="min-w-[28rem] space-y-2">
          {rootNodes.length ? rootNodes.map(node => <TreeBranch key={node.id} node={node} nodes={block.nodes} depth={0} />) : <VisualEmpty icon={GitBranch} text="Add a root node to start the tree." />}
        </div>
      </div>
      <div className="space-y-2">
        {block.nodes.map(node => (
          <div key={node.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-[var(--color-rule)] bg-[var(--color-surface)] p-2">
            <input value={node.label} onChange={event => updateNode(node.id, { label: event.target.value })} aria-label="Node label" placeholder="Node" className={smallInputClass} />
            <input value={node.detail || ''} onChange={event => updateNode(node.id, { detail: event.target.value })} aria-label="Node detail" placeholder="Why it matters" className={smallInputClass} />
            <div className="flex items-center gap-1 flex-wrap">
              <span className="font-mono text-[0.625rem] text-[var(--color-ink-muted)]">Parent:</span>
              <button
                type="button"
                onClick={() => updateNode(node.id, { parentId: null })}
                className={`px-2 py-0.5 rounded text-[0.6875rem] font-mono transition-all ${
                  !node.parentId
                    ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 font-bold'
                    : 'border border-[var(--color-rule)] bg-[var(--color-paper)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
                }`}
              >
                Root
              </button>
              {block.nodes
                .filter(candidate => candidate.id !== node.id)
                .map(candidate => {
                  const isSelected = node.parentId === candidate.id;
                  return (
                    <button
                      key={candidate.id}
                      type="button"
                      onClick={() => updateNode(node.id, { parentId: candidate.id })}
                      className={`px-2 py-0.5 rounded text-[0.6875rem] font-mono transition-all truncate max-w-28 ${
                        isSelected
                          ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 font-bold'
                          : 'border border-[var(--color-rule)] bg-[var(--color-paper)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
                      }`}
                      title={candidate.label}
                    >
                      {candidate.label || 'Untitled'}
                    </button>
                  );
                })}
            </div>
            <button type="button" onClick={() => removeNode(node.id)} aria-label="Delete tree node" className="p-1 text-[var(--color-ink-muted)] hover:text-rose-600"><Trash2 size={13} /></button>
          </div>
        ))}
        <button type="button" onClick={() => onUpdate({ nodes: [...block.nodes, { id: crypto.randomUUID(), parentId: block.nodes[0]?.id || null, label: 'New node' }] })} className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs"><Plus size={13} /> Add node</button>
      </div>
    </div>
  );
};

const TreeBranch: React.FC<{ node: TreeNode; nodes: TreeNode[]; depth: number }> = ({ node, nodes, depth }) => {
  const children = nodes.filter(candidate => candidate.parentId === node.id);
  return (
    <div className="relative">
      <div className="flex items-stretch gap-3">
        {depth > 0 && <div className="w-5 border-b border-l border-[var(--color-rule)]" />}
        <div className="min-w-44 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 dark:border-indigo-900 dark:bg-indigo-950/40">
          <div className="text-xs font-semibold text-[var(--color-ink)]">{node.label || 'Untitled node'}</div>
          {node.detail && <div className="mt-1 text-[0.6875rem] leading-relaxed text-[var(--color-ink-muted)]">{node.detail}</div>}
        </div>
      </div>
      {children.length > 0 && <div className="ml-8 mt-2 space-y-2 border-l border-[var(--color-rule)] pl-3">{children.map(child => <TreeBranch key={child.id} node={child} nodes={nodes} depth={depth + 1} />)}</div>}
    </div>
  );
};

const GraphEditor: React.FC<{ block: GraphBlock; onUpdate: (updates: Partial<LearnBlock>) => void }> = ({ block, onUpdate }) => {
  const [fromId, setFromId] = useState(block.nodes[0]?.id || '');
  const [toId, setToId] = useState(block.nodes[1]?.id || '');
  const positions = useMemo(() => graphPositions(block.nodes.length), [block.nodes.length]);
  const positionById = new Map(block.nodes.map((node, index) => [node.id, positions[index]]));

  return (
    <div className="space-y-4">
      <input value={block.title} onChange={event => onUpdate({ title: event.target.value })} placeholder="Relationship map title" className={inputClass} />
      <div className="overflow-hidden rounded-xl border border-[var(--color-rule)] bg-[var(--color-surface)]">
        {block.nodes.length ? (
          <svg viewBox="0 0 640 300" className="h-auto min-h-64 w-full" role="img" aria-label={block.title || 'Concept relationship graph'}>
            <defs><marker id={`arrow-${block.id}`} markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="var(--color-ink-muted)" /></marker></defs>
            {block.edges.map(edge => {
              const from = positionById.get(edge.from);
              const to = positionById.get(edge.to);
              if (!from || !to) return null;
              const midX = (from.x + to.x) / 2;
              const midY = (from.y + to.y) / 2;
              return <g key={edge.id}><line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="var(--color-ink-muted)" strokeWidth="1.5" markerEnd={`url(#arrow-${block.id})`} /><text x={midX} y={midY - 6} textAnchor="middle" fill="var(--color-ink-muted)" fontSize="11">{edge.label}</text></g>;
            })}
            {block.nodes.map(node => {
              const position = positionById.get(node.id)!;
              return <g key={node.id}><circle cx={position.x} cy={position.y} r="42" fill="var(--accent-indigo-soft)" stroke="var(--accent-indigo)" strokeWidth="1.5" /><text x={position.x} y={position.y} textAnchor="middle" dominantBaseline="middle" fill="var(--color-ink)" fontSize="12">{truncate(node.label, 15)}</text></g>;
            })}
          </svg>
        ) : <VisualEmpty icon={Network} text="Add two nodes, then connect them." />}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {block.nodes.map(node => (
          <div key={node.id} className="flex items-center gap-2 rounded-lg border bg-[var(--color-surface)] p-2">
            <input value={node.label} onChange={event => onUpdate({ nodes: block.nodes.map(candidate => candidate.id === node.id ? { ...candidate, label: event.target.value } : candidate) })} aria-label="Graph node label" className={smallInputClass} />
            <button type="button" onClick={() => onUpdate({ nodes: block.nodes.filter(candidate => candidate.id !== node.id), edges: block.edges.filter(edge => edge.from !== node.id && edge.to !== node.id) })} aria-label="Delete graph node" className="p-1 text-[var(--color-ink-muted)] hover:text-rose-600"><Trash2 size={13} /></button>
          </div>
        ))}
      </div>
      <button type="button" onClick={() => onUpdate({ nodes: [...block.nodes, { id: crypto.randomUUID(), label: 'New node' }] })} className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs"><Plus size={13} /> Add node</button>
      {block.nodes.length > 1 && (
        <div className="flex flex-col gap-2 rounded-lg border border-[var(--color-rule)] bg-[var(--color-surface)] p-3">
          <div className="flex items-center justify-between text-xs font-semibold text-[var(--color-ink)]">
            <span>Connect Nodes</span>
            <button
              type="button"
              disabled={!fromId || !toId || fromId === toId}
              onClick={() => {
                if (fromId && toId && fromId !== toId) {
                  onUpdate({ edges: [...block.edges, { id: crypto.randomUUID(), from: fromId, to: toId, label: 'relates to' }] });
                }
              }}
              className="rounded-lg border border-indigo-500 bg-indigo-50 dark:bg-indigo-950/60 px-3 py-1 text-xs font-mono font-bold text-indigo-700 dark:text-indigo-300 disabled:opacity-40 cursor-pointer"
            >
              + Create Link
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div className="space-y-1">
              <span className="font-mono text-[0.625rem] text-[var(--color-ink-muted)]">FROM:</span>
              <div className="flex flex-wrap gap-1">
                {block.nodes.map(node => (
                  <button
                    key={node.id}
                    type="button"
                    onClick={() => setFromId(node.id)}
                    className={`px-2 py-1 rounded text-xs font-mono transition-all ${
                      fromId === node.id
                        ? 'bg-indigo-600 text-white font-bold'
                        : 'border border-[var(--color-rule)] bg-[var(--color-paper)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
                    }`}
                  >
                    {node.label || 'Untitled'}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <span className="font-mono text-[0.625rem] text-[var(--color-ink-muted)]">TO:</span>
              <div className="flex flex-wrap gap-1">
                {block.nodes.map(node => (
                  <button
                    key={node.id}
                    type="button"
                    onClick={() => setToId(node.id)}
                    className={`px-2 py-1 rounded text-xs font-mono transition-all ${
                      toId === node.id
                        ? 'bg-teal-600 text-white font-bold'
                        : 'border border-[var(--color-rule)] bg-[var(--color-paper)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
                    }`}
                  >
                    {node.label || 'Untitled'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      {block.edges.map(edge => (
        <div key={edge.id} className="flex items-center gap-2 text-xs">
          <span className="font-mono text-[var(--color-ink-muted)]">{block.nodes.find(node => node.id === edge.from)?.label} → {block.nodes.find(node => node.id === edge.to)?.label}</span>
          <input value={edge.label} onChange={event => onUpdate({ edges: block.edges.map(candidate => candidate.id === edge.id ? { ...candidate, label: event.target.value } : candidate) })} aria-label="Edge label" className={smallInputClass} />
          <button type="button" onClick={() => onUpdate({ edges: block.edges.filter(candidate => candidate.id !== edge.id) })} aria-label="Delete graph edge" className="p-1 text-[var(--color-ink-muted)] hover:text-rose-600"><X size={12} /></button>
        </div>
      ))}
    </div>
  );
};

const DerivationEditor: React.FC<{ block: DerivationBlock; onUpdate: (updates: Partial<LearnBlock>) => void }> = ({ block, onUpdate }) => {
  const [testMode, setTestMode] = useState(Boolean(block.testMode));
  const [revealedStepIds, setRevealedStepIds] = useState<Record<string, boolean>>({});

  const toggleTestMode = () => {
    const next = !testMode;
    setTestMode(next);
    onUpdate({ testMode: next });
    if (next) {
      setRevealedStepIds({});
    }
  };

  const revealStep = (id: string) => {
    setRevealedStepIds(prev => ({ ...prev, [id]: true }));
  };

  const hideStep = (id: string) => {
    setRevealedStepIds(prev => ({ ...prev, [id]: false }));
  };

  const revealAll = () => {
    const map: Record<string, boolean> = {};
    block.steps.forEach(s => { map[s.id] = true; });
    setRevealedStepIds(map);
  };

  const hideAll = () => {
    setRevealedStepIds({});
  };

  const updateStep = (id: string, updates: Partial<DerivationStep>) => {
    onUpdate({
      steps: block.steps.map(s => (s.id === id ? { ...s, ...updates } : s))
    });
  };

  const addStep = () => {
    const newStep: DerivationStep = {
      id: crypto.randomUUID(),
      latex: '',
      explanation: '',
      rule: ''
    };
    onUpdate({ steps: [...block.steps, newStep] });
  };

  const removeStep = (id: string) => {
    onUpdate({ steps: block.steps.filter(s => s.id !== id) });
  };

  const moveStep = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= block.steps.length) return;
    const next = [...block.steps];
    [next[index], next[target]] = [next[target], next[index]];
    onUpdate({ steps: next });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-rule)]/50 pb-2">
        <input
          value={block.title}
          onChange={event => onUpdate({ title: event.target.value })}
          placeholder="Derivation title (e.g. Softmax Gradient or Variance Scaling)"
          className="min-w-64 flex-1 border-0 bg-transparent text-sm font-semibold text-[var(--color-ink)] outline-none"
        />
        <button
          type="button"
          onClick={toggleTestMode}
          title="Toggle blank paper test mode to hide intermediate steps and test your recall on paper"
          className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-mono font-medium transition-colors ${
            testMode
              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
              : 'border border-[var(--color-rule)] bg-[var(--color-surface)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
          }`}
        >
          {testMode ? <EyeOff size={13} /> : <Eye size={13} />}
          {testMode ? 'Recall Mode: ACTIVE' : 'Test Myself (Blank Paper)'}
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1">
          <span className="text-[0.6875rem] font-mono uppercase tracking-wider text-[var(--color-ink-muted)]">Objective / Claim to Prove</span>
          <input
            value={block.objective || ''}
            onChange={event => onUpdate({ objective: event.target.value })}
            placeholder="e.g. Show Var(q · k) = d_k to justify 1/√d_k"
            className={inputClass}
          />
        </label>
        <label className="space-y-1">
          <span className="text-[0.6875rem] font-mono uppercase tracking-wider text-[var(--color-ink-muted)]">Starting Formulation (LaTeX)</span>
          <input
            value={block.initialEquation || ''}
            onChange={event => onUpdate({ initialEquation: event.target.value })}
            placeholder="e.g. q = \sum_{i=1}^{d_k} q_i k_i"
            className={inputClass}
          />
        </label>
      </div>

      {block.initialEquation && (
        <div className="rounded-xl border border-[var(--color-rule)] bg-[var(--color-surface)] p-3">
          <span className="text-[0.625rem] font-mono uppercase text-[var(--color-ink-muted)]">Initial state:</span>
          <MathView math={block.initialEquation} block draggable={false} showAiAction={false} />
        </div>
      )}

      {testMode && (
        <div className="flex items-center justify-between rounded-xl border border-amber-300 bg-amber-50/60 p-2.5 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          <span className="flex items-center gap-1.5 font-medium">
            <EyeOff size={13} /> Blank Paper Test: Try deriving the next step on scratch paper!
          </span>
          <div className="flex items-center gap-2">
            <button type="button" onClick={revealAll} className="underline hover:text-amber-950 dark:hover:text-amber-100">Reveal all</button>
            <span>·</span>
            <button type="button" onClick={hideAll} className="underline hover:text-amber-950 dark:hover:text-amber-100">Hide all</button>
          </div>
        </div>
      )}

      {/* Step stream */}
      <div className="space-y-3">
        {block.steps.map((step, sIndex) => {
          const isRevealed = !testMode || Boolean(revealedStepIds[step.id]);
          return (
            <div
              key={step.id}
              className="rounded-xl border border-[var(--color-rule)] bg-[var(--color-surface)] p-3 transition-colors"
            >
              <div className="flex items-center justify-between gap-2 border-b border-[var(--color-rule)]/40 pb-2">
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-indigo-100 px-2 py-0.5 text-[0.6875rem] font-mono font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                    Step {sIndex + 1}
                  </span>
                  <input
                    value={step.rule || ''}
                    onChange={event => updateStep(step.id, { rule: event.target.value })}
                    placeholder="Rule / Trick (e.g. Independence of components)"
                    className="border-0 bg-transparent text-xs font-mono text-[var(--color-ink-muted)] outline-none placeholder:text-[var(--color-ink-muted)]/50"
                  />
                </div>
                <div className="flex items-center gap-1">
                  {testMode && (
                    <button
                      type="button"
                      onClick={() => (isRevealed ? hideStep(step.id) : revealStep(step.id))}
                      className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs text-amber-700 hover:bg-amber-100 dark:text-amber-300 dark:hover:bg-amber-950"
                    >
                      {isRevealed ? <EyeOff size={12} /> : <Eye size={12} />}
                      {isRevealed ? 'Hide' : 'Reveal'}
                    </button>
                  )}
                  <button type="button" onClick={() => moveStep(sIndex, -1)} disabled={sIndex === 0} className="p-1 text-[var(--color-ink-muted)] disabled:opacity-20 hover:text-[var(--color-ink)]">
                    <ArrowUp size={12} />
                  </button>
                  <button type="button" onClick={() => moveStep(sIndex, 1)} disabled={sIndex === block.steps.length - 1} className="p-1 text-[var(--color-ink-muted)] disabled:opacity-20 hover:text-[var(--color-ink)]">
                    <ArrowDown size={12} />
                  </button>
                  <button type="button" onClick={() => removeStep(step.id)} className="p-1 text-[var(--color-ink-muted)] hover:text-rose-600">
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>

              {isRevealed ? (
                <div className="mt-3 space-y-2">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <label className="space-y-1">
                      <span className="text-[0.625rem] font-mono text-[var(--color-ink-muted)]">Equation (LaTeX)</span>
                      <input
                        value={step.latex}
                        onChange={event => updateStep(step.id, { latex: event.target.value })}
                        placeholder="e.g. \text{Var}(q_i k_i) = \text{E}[q_i^2]\text{E}[k_i^2] - (\text{E}[q_i]\text{E}[k_i])^2"
                        className={inputClass}
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="text-[0.625rem] font-mono text-[var(--color-ink-muted)]">Why this step holds / Justification</span>
                      <input
                        value={step.explanation}
                        onChange={event => updateStep(step.id, { explanation: event.target.value })}
                        placeholder="e.g. Because components are i.i.d. zero-mean with variance 1"
                        className={inputClass}
                      />
                    </label>
                  </div>
                  {step.latex && (
                    <div className="mt-2 rounded-lg bg-[var(--color-paper)] p-2">
                      <MathView math={step.latex} block draggable={false} showAiAction={false} />
                    </div>
                  )}
                </div>
              ) : (
                <div className="mt-3 flex items-center justify-between rounded-lg border border-dashed border-[var(--color-rule)] bg-[var(--color-paper)] p-4 text-center">
                  <span className="text-xs text-[var(--color-ink-muted)]">
                    Step concealed for blank paper practice: {step.rule || `Step ${sIndex + 1}`}
                  </span>
                  <button
                    type="button"
                    onClick={() => revealStep(step.id)}
                    className="rounded-lg bg-amber-600 px-3 py-1 text-xs font-semibold text-white hover:bg-amber-700"
                  >
                    Reveal Step {sIndex + 1}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={addStep}
        className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-[var(--color-rule)] bg-[var(--color-surface)] px-3 py-2 text-xs font-medium text-[var(--color-ink)] hover:border-indigo-400"
      >
        <Plus size={13} /> Add derivation step
      </button>

      {/* Conclusion */}
      <div className="mt-2 space-y-1.5 rounded-xl border border-emerald-300/60 bg-emerald-50/40 p-3 dark:border-emerald-900/60 dark:bg-emerald-950/20">
        <span className="text-[0.6875rem] font-mono uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
          Conclusion / Final Q.E.D. (LaTeX)
        </span>
        <input
          value={block.conclusion || ''}
          onChange={event => onUpdate({ conclusion: event.target.value })}
          placeholder="e.g. \text{Var}\left(\frac{q \cdot k}{\sqrt{d_k}}\right) = \frac{d_k}{d_k} = 1 \quad \blacksquare"
          className={inputClass}
        />
        {block.conclusion && (
          <div className="mt-2 rounded-lg bg-[var(--color-paper)] p-2">
            <MathView math={block.conclusion} block draggable={false} showAiAction={false} />
          </div>
        )}
      </div>
    </div>
  );
};

const TensorEditor: React.FC<{ block: TensorBlock; onUpdate: (updates: Partial<LearnBlock>) => void }> = ({ block, onUpdate }) => {
  const updateRow = (id: string, updates: Partial<TensorOpRow>) => {
    onUpdate({
      rows: block.rows.map(row => (row.id === id ? { ...row, ...updates } : row))
    });
  };

  const addRow = () => {
    const newRow: TensorOpRow = {
      id: crypto.randomUUID(),
      operation: '',
      inputShape: '',
      outputShape: '',
      parameters: '',
      notes: ''
    };
    onUpdate({ rows: [...block.rows, newRow] });
  };

  const removeRow = (id: string) => {
    onUpdate({ rows: block.rows.filter(row => row.id !== id) });
  };

  const moveRow = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= block.rows.length) return;
    const next = [...block.rows];
    [next[index], next[target]] = [next[target], next[index]];
    onUpdate({ rows: next });
  };

  const loadAttentionPreset = () => {
    onUpdate({
      title: 'Multi-Head Self-Attention Shape Flow',
      architectureName: 'Standard Decoder Transformer Layer',
      symbolsLegend: 'B = Batch, T = Context tokens, D = Model dim, H = Heads, d_k = D/H',
      rows: [
        { id: crypto.randomUUID(), operation: 'Input Hidden States', inputShape: '[B, T, D]', outputShape: '[B, T, D]', parameters: 'None', notes: 'Residual stream input' },
        { id: crypto.randomUUID(), operation: 'Q, K, V Linear Projections', inputShape: '[B, T, D]', outputShape: '3 × [B, H, T, d_k]', parameters: '3 × (D × D)', notes: 'Reshaped & transposed to H heads' },
        { id: crypto.randomUUID(), operation: 'Attention Scores (Q · K^T / √d_k)', inputShape: '[B, H, T, d_k] × [B, H, d_k, T]', outputShape: '[B, H, T, T]', parameters: 'None', notes: 'Apply causal upper-triangular mask' },
        { id: crypto.randomUUID(), operation: 'Softmax Probabilities × V', inputShape: '[B, H, T, T] × [B, H, T, d_k]', outputShape: '[B, H, T, d_k]', parameters: 'None', notes: 'Weighted values per head' },
        { id: crypto.randomUUID(), operation: 'Concatenate Heads & Out Projection', inputShape: '[B, T, D]', outputShape: '[B, T, D]', parameters: 'D × D', notes: 'Output added to residual stream' }
      ]
    });
  };

  const loadSwiGLUPreset = () => {
    onUpdate({
      title: 'SwiGLU Feed-Forward Network Shape Flow',
      architectureName: 'LLaMA / Mistral FFN Block',
      symbolsLegend: 'B = Batch, T = Context, D = 4096, d_ff = 11008 (approx 8/3 D)',
      rows: [
        { id: crypto.randomUUID(), operation: 'Input (after RMSNorm)', inputShape: '[B, T, D]', outputShape: '[B, T, D]', parameters: 'None', notes: 'Pre-norm input' },
        { id: crypto.randomUUID(), operation: 'Gate & Up Projections', inputShape: '[B, T, D]', outputShape: '2 × [B, T, d_ff]', parameters: '2 × (D × d_ff)', notes: 'W_gate and W_up matrices' },
        { id: crypto.randomUUID(), operation: 'SwiGLU Activation: SiLU(Gate) ⊙ Up', inputShape: '2 × [B, T, d_ff]', outputShape: '[B, T, d_ff]', parameters: 'None', notes: 'Element-wise Hadamard product' },
        { id: crypto.randomUUID(), operation: 'Down Projection', inputShape: '[B, T, d_ff]', outputShape: '[B, T, D]', parameters: 'd_ff × D', notes: 'Project back to residual dimension' }
      ]
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-rule)]/50 pb-2">
        <input
          value={block.title}
          onChange={event => onUpdate({ title: event.target.value })}
          placeholder="Tensor block title (e.g. Multi-Head Self-Attention Dimension Flow)"
          className="min-w-64 flex-1 border-0 bg-transparent text-sm font-semibold text-[var(--color-ink)] outline-none"
        />
        <div className="flex items-center gap-1.5 text-xs">
          <span className="font-mono text-[var(--color-ink-muted)]">Presets:</span>
          <button type="button" onClick={loadAttentionPreset} className="rounded-md border border-[var(--color-rule)] bg-[var(--color-surface)] px-2 py-0.5 font-mono text-[0.6875rem] hover:text-[var(--color-ink)]">Attention MHA</button>
          <button type="button" onClick={loadSwiGLUPreset} className="rounded-md border border-[var(--color-rule)] bg-[var(--color-surface)] px-2 py-0.5 font-mono text-[0.6875rem] hover:text-[var(--color-ink)]">SwiGLU FFN</button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1">
          <span className="text-[0.6875rem] font-mono uppercase tracking-wider text-[var(--color-ink-muted)]">Model / Architecture</span>
          <input
            value={block.architectureName || ''}
            onChange={event => onUpdate({ architectureName: event.target.value })}
            placeholder="e.g. LLaMA 3 8B / GPT-4 decoder layer"
            className={inputClass}
          />
        </label>
        <label className="space-y-1">
          <span className="text-[0.6875rem] font-mono uppercase tracking-wider text-[var(--color-ink-muted)]">Symbols & Dimension Values</span>
          <input
            value={block.symbolsLegend || ''}
            onChange={event => onUpdate({ symbolsLegend: event.target.value })}
            placeholder="e.g. B=batch, T=4096, D=4096, H=32, d_k=128"
            className={inputClass}
          />
        </label>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[var(--color-rule)]">
        <table className="w-full min-w-[44rem] border-collapse text-xs">
          <thead>
            <tr className="border-b border-[var(--color-rule)] bg-[var(--color-surface)] text-left text-[0.6875rem] font-mono text-[var(--color-ink-muted)]">
              <th className="p-2.5 pl-3">Layer / Operation</th>
              <th className="p-2.5">Input Shape</th>
              <th className="p-2.5">Output Shape</th>
              <th className="p-2.5">Parameters</th>
              <th className="p-2.5">Invariant / Notes</th>
              <th className="p-2.5 pr-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-rule)]/50 bg-[var(--color-paper)]">
            {block.rows.map((row, rIndex) => (
              <tr key={row.id} className="hover:bg-[var(--color-surface)]/40">
                <td className="p-2 pl-3">
                  <input
                    value={row.operation}
                    onChange={event => updateRow(row.id, { operation: event.target.value })}
                    placeholder="Operation name"
                    className="w-full rounded border border-[var(--color-rule)]/70 bg-[var(--color-surface)] px-2 py-1 font-medium text-[var(--color-ink)]"
                  />
                </td>
                <td className="p-2">
                  <input
                    value={row.inputShape}
                    onChange={event => updateRow(row.id, { inputShape: event.target.value })}
                    placeholder="[B, T, D]"
                    className="w-full rounded border border-[var(--color-rule)]/70 bg-[var(--color-surface)] px-2 py-1 font-mono text-indigo-600 dark:text-indigo-400"
                  />
                </td>
                <td className="p-2">
                  <input
                    value={row.outputShape}
                    onChange={event => updateRow(row.id, { outputShape: event.target.value })}
                    placeholder="[B, T, D]"
                    className="w-full rounded border border-[var(--color-rule)]/70 bg-[var(--color-surface)] px-2 py-1 font-mono text-emerald-600 dark:text-emerald-400 font-semibold"
                  />
                </td>
                <td className="p-2">
                  <input
                    value={row.parameters || ''}
                    onChange={event => updateRow(row.id, { parameters: event.target.value })}
                    placeholder="D × D"
                    className="w-full rounded border border-[var(--color-rule)]/70 bg-[var(--color-surface)] px-2 py-1 font-mono text-[var(--color-ink-muted)]"
                  />
                </td>
                <td className="p-2">
                  <input
                    value={row.notes || ''}
                    onChange={event => updateRow(row.id, { notes: event.target.value })}
                    placeholder="Causal mask, activation..."
                    className="w-full rounded border border-[var(--color-rule)]/70 bg-[var(--color-surface)] px-2 py-1 text-[var(--color-ink)]"
                  />
                </td>
                <td className="p-2 pr-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button type="button" onClick={() => moveRow(rIndex, -1)} disabled={rIndex === 0} className="p-1 text-[var(--color-ink-muted)] disabled:opacity-20 hover:text-[var(--color-ink)]">
                      <ArrowUp size={12} />
                    </button>
                    <button type="button" onClick={() => moveRow(rIndex, 1)} disabled={rIndex === block.rows.length - 1} className="p-1 text-[var(--color-ink-muted)] disabled:opacity-20 hover:text-[var(--color-ink)]">
                      <ArrowDown size={12} />
                    </button>
                    <button type="button" onClick={() => removeRow(row.id)} className="p-1 text-[var(--color-ink-muted)] hover:text-rose-600">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        type="button"
        onClick={addRow}
        className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-[var(--color-rule)] bg-[var(--color-surface)] px-3 py-2 text-xs font-medium text-[var(--color-ink)] hover:border-indigo-400"
      >
        <Plus size={13} /> Add layer operation
      </button>
    </div>
  );
};

const CodeEditor: React.FC<{ block: CodeBlock; onUpdate: (updates: Partial<LearnBlock>) => void }> = ({ block, onUpdate }) => {
  const [copied, setCopied] = useState(false);

  const copyCode = () => {
    navigator.clipboard.writeText(block.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-rule)]/50 pb-2">
        <input
          value={block.title}
          onChange={event => onUpdate({ title: event.target.value })}
          placeholder="Code snippet title (e.g. Vectorized PyTorch Scaled Dot-Product Attention)"
          className="min-w-64 flex-1 border-0 bg-transparent text-sm font-semibold text-[var(--color-ink)] outline-none"
        />
        <div className="flex items-center gap-2">
          <select
            value={block.language}
            onChange={event => onUpdate({ language: event.target.value })}
            className="rounded-lg border border-[var(--color-rule)] bg-[var(--color-surface)] px-2 py-1 text-xs font-mono"
          >
            <option value="pytorch">PyTorch</option>
            <option value="python">Python</option>
            <option value="cuda">CUDA / Triton</option>
            <option value="pseudocode">Pseudocode</option>
          </select>
          <button
            type="button"
            onClick={copyCode}
            className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-rule)] bg-[var(--color-surface)] px-2.5 py-1 text-xs font-mono text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
          >
            {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>

      <div className="relative rounded-xl border border-[var(--color-rule)] bg-[var(--color-surface)] font-mono text-xs">
        <textarea
          value={block.code}
          onChange={event => onUpdate({ code: event.target.value })}
          rows={9}
          placeholder="def forward(q, k, v, mask=None):&#10;    # Write clean vectorized tensor logic here&#10;    ..."
          spellCheck={false}
          className="w-full resize-y rounded-xl border-0 bg-transparent p-3 font-mono text-xs leading-relaxed text-[var(--color-ink)] outline-none"
        />
      </div>

      <label className="block space-y-1">
        <span className="text-[0.6875rem] font-mono uppercase tracking-wider text-[var(--color-ink-muted)]">
          Implementation Invariants / Critical Gotchas
        </span>
        <input
          value={block.notes || ''}
          onChange={event => onUpdate({ notes: event.target.value })}
          placeholder="e.g. Always apply mask before softmax; scaling prevents zero gradients in extreme dimensions"
          className={inputClass}
        />
      </label>
    </div>
  );
};

const VisualEmpty: React.FC<{ icon: React.ComponentType<{ size?: number }>; text: string }> = ({ icon: Icon, text }) => (
  <div className="flex min-h-48 flex-col items-center justify-center gap-2 text-[var(--color-ink-muted)]"><Icon size={24} /><span className="text-xs">{text}</span></div>
);

function graphPositions(count: number): Array<{ x: number; y: number }> {
  if (count === 1) return [{ x: 320, y: 150 }];
  const radius = Math.min(105, 42 + count * 8);
  return Array.from({ length: count }, (_, index) => {
    const angle = (Math.PI * 2 * index) / count - Math.PI / 2;
    return { x: 320 + Math.cos(angle) * radius * 2, y: 150 + Math.sin(angle) * radius };
  });
}

function getBlockText(block: LearnBlock): string {
  if (block.kind === 'card') return `${block.front}\n\n${block.back}`.trim();
  if (block.kind === 'note') return block.text.trim();
  if (block.kind === 'image') return block.caption.trim();
  if (block.kind === 'table') return [block.title, ...block.rows.flat()].filter(Boolean).join(' · ');
  if (block.kind === 'tree') return [block.title, ...block.nodes.map(node => `${node.label}: ${node.detail || ''}`)].filter(Boolean).join(' · ');
  if (block.kind === 'derivation') {
    return [block.title, block.objective, block.initialEquation, ...block.steps.map(s => `${s.rule || ''}: ${s.latex} (${s.explanation})`), block.conclusion].filter(Boolean).join('\n');
  }
  if (block.kind === 'tensor') {
    return [block.title, block.architectureName, block.symbolsLegend, ...block.rows.map(r => `${r.operation}: ${r.inputShape} -> ${r.outputShape} (${r.notes || ''})`)].filter(Boolean).join(' · ');
  }
  if (block.kind === 'code') {
    return `${block.title} (${block.language}):\n${block.code}\n${block.notes || ''}`.trim();
  }
  return [block.title, ...block.nodes.map(node => node.label), ...block.edges.map(edge => edge.label)].filter(Boolean).join(' · ');
}

function formatDue(timestamp: number): string {
  const diffDays = Math.ceil((timestamp - Date.now()) / 86_400_000);
  if (diffDays <= 0) return 'now';
  if (diffDays === 1) return 'tomorrow';
  return `in ${diffDays} days`;
}

function truncate(value: string, length: number): string {
  return value.length > length ? `${value.slice(0, length - 1)}…` : value;
}
