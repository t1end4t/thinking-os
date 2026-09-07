import React, { useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Brain,
  Check,
  CircleHelp,
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
  Sparkles,
  Trash2,
  X
} from 'lucide-react';
import {
  CardBlock,
  COGNITIVE_LEVELS,
  GraphBlock,
  ImageBlock,
  LearnBlock,
  LearnBlockKind,
  NoteBlock,
  TableBlock,
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
            <select value={node.parentId || ''} onChange={event => updateNode(node.id, { parentId: event.target.value || null })} aria-label="Parent node" className={smallInputClass}>
              <option value="">Root</option>
              {block.nodes.filter(candidate => candidate.id !== node.id).map(candidate => <option key={candidate.id} value={candidate.id}>{candidate.label || 'Untitled node'}</option>)}
            </select>
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
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-[var(--color-rule)] bg-[var(--color-surface)] p-2">
          <select value={fromId} onChange={event => setFromId(event.target.value)} aria-label="Edge start" className={smallInputClass}>{block.nodes.map(node => <option key={node.id} value={node.id}>{node.label}</option>)}</select>
          <span className="text-xs text-[var(--color-ink-muted)]">to</span>
          <select value={toId} onChange={event => setToId(event.target.value)} aria-label="Edge end" className={smallInputClass}>{block.nodes.map(node => <option key={node.id} value={node.id}>{node.label}</option>)}</select>
          <button type="button" onClick={() => fromId && toId && fromId !== toId && onUpdate({ edges: [...block.edges, { id: crypto.randomUUID(), from: fromId, to: toId, label: 'relates to' }] })} className="rounded-lg border px-2.5 py-1.5 text-xs">Connect</button>
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
