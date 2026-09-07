import React, { useState } from 'react';
import { X, Plus, Trash2, BookOpen, Layers, Sparkles } from 'lucide-react';
import { LearningUnit, CognitiveLevelId } from '../../learnTypes';

interface UnitEditorModalProps {
  unit?: LearningUnit | null;
  defaultBook?: string;
  defaultChapter?: string;
  isOpen: boolean;
  onClose: () => void;
  onSave: (unitData: Partial<LearningUnit> & { title: string; category: LearningUnit['category'] }) => void;
}

const CATEGORIES: LearningUnit['category'][] = [
  'Attention & Architecture',
  'Optimization & Calculus',
  'LLM Reasoning & Alignment',
  'Linear Algebra',
  'Information Theory',
  'General Math'
];

const MATH_FIELDS: string[] = [
  'Linear Algebra',
  'Information Theory',
  'Continuous Optimization',
  'Real Analysis',
  'Probability & Statistics',
  'Differential Geometry',
  'Game Theory',
  'Numerical Methods'
];

export const UnitEditorModal: React.FC<UnitEditorModalProps> = ({
  unit,
  defaultBook,
  defaultChapter,
  isOpen,
  onClose,
  onSave
}) => {
  const [title, setTitle] = useState(unit?.title || '');
  const [description, setDescription] = useState(unit?.description || '');
  const [book, setBook] = useState(unit?.book || defaultBook || 'Understanding Deep Learning (Simon J.D. Prince)');
  const [chapter, setChapter] = useState(unit?.chapter || defaultChapter || '');
  const [section, setSection] = useState(unit?.section || '');
  const [keyFormulaLatex, setKeyFormulaLatex] = useState(unit?.keyFormulaLatex || '');
  const [toyCodeSnippet, setToyCodeSnippet] = useState(unit?.toyCodeSnippet || '');
  const [category, setCategory] = useState<LearningUnit['category']>(
    unit?.category || 'Attention & Architecture'
  );
  const [difficulty, setDifficulty] = useState<LearningUnit['difficulty']>(
    unit?.difficulty || 'Intermediate'
  );
  const [tags, setTags] = useState<string[]>(unit?.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [mathFields, setMathFields] = useState<string[]>(unit?.mathFields || []);
  const [prerequisites, setPrerequisites] = useState<string[]>(unit?.prerequisites || []);
  const [prereqInput, setPrereqInput] = useState('');

  if (!isOpen) return null;

  const handleAddTag = () => {
    if (!tagInput.trim()) return;
    const clean = tagInput.trim().replace(/^#/, '');
    if (!tags.includes(clean)) setTags([...tags, clean]);
    setTagInput('');
  };

  const handleRemoveTag = (t: string) => {
    setTags(tags.filter(item => item !== t));
  };

  const handleToggleMathField = (field: string) => {
    if (mathFields.includes(field)) {
      setMathFields(mathFields.filter(f => f !== field));
    } else {
      setMathFields([...mathFields, field]);
    }
  };

  const handleAddPrereq = () => {
    if (!prereqInput.trim()) return;
    if (!prerequisites.includes(prereqInput.trim())) {
      setPrerequisites([...prerequisites, prereqInput.trim()]);
    }
    setPrereqInput('');
  };

  const handleRemovePrereq = (p: string) => {
    setPrerequisites(prerequisites.filter(item => item !== p));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onSave({
      ...(unit ? { id: unit.id } : {}),
      title: title.trim(),
      description: description.trim(),
      book: book.trim() || undefined,
      chapter: chapter.trim() || undefined,
      section: section.trim() || undefined,
      keyFormulaLatex: keyFormulaLatex.trim() || undefined,
      toyCodeSnippet: toyCodeSnippet.trim() || undefined,
      category,
      difficulty,
      tags,
      mathFields,
      prerequisites
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-2xl bg-[var(--color-surface)] border border-[var(--color-rule)] rounded-2xl shadow-xl flex flex-col max-h-[90vh] overflow-hidden animate-fadeIn"
        role="dialog"
        aria-modal="true"
        aria-labelledby="unit-editor-title"
      >
        {/* Header */}
        <div className="p-4 border-b border-[var(--color-rule)] flex items-center justify-between bg-[var(--color-paper)]">
          <div className="flex items-center gap-2">
            <BookOpen size={18} className="text-emerald-500" />
            <h2 id="unit-editor-title" className="text-sm font-semibold text-[var(--color-ink)]">
              {unit ? 'Edit Learning Unit' : 'Create New Learning Unit'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-rule)]/30"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4 overflow-y-auto">
          {/* Book / Literature Source & Chapter */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-xl bg-[var(--color-paper)] border border-[var(--color-rule)]">
            <div className="flex flex-col gap-1 sm:col-span-1">
              <label className="text-[0.6875rem] font-mono font-medium text-[var(--color-ink)]">
                Textbook / Source
              </label>
              <input
                type="text"
                value={book}
                onChange={e => setBook(e.target.value)}
                placeholder="e.g. Understanding Deep Learning"
                className="px-2.5 py-1.5 text-xs rounded-lg border border-[var(--color-rule)] bg-[var(--color-surface)] text-[var(--color-ink)] focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div className="flex flex-col gap-1 sm:col-span-1">
              <label className="text-[0.6875rem] font-mono font-medium text-[var(--color-ink)]">
                Chapter
              </label>
              <input
                type="text"
                value={chapter}
                onChange={e => setChapter(e.target.value)}
                placeholder="e.g. Chapter 12: Attention"
                className="px-2.5 py-1.5 text-xs rounded-lg border border-[var(--color-rule)] bg-[var(--color-surface)] text-[var(--color-ink)] focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div className="flex flex-col gap-1 sm:col-span-1">
              <label className="text-[0.6875rem] font-mono font-medium text-[var(--color-ink)]">
                Section
              </label>
              <input
                type="text"
                value={section}
                onChange={e => setSection(e.target.value)}
                placeholder="e.g. 12.2 Scaled Attention"
                className="px-2.5 py-1.5 text-xs rounded-lg border border-[var(--color-rule)] bg-[var(--color-surface)] text-[var(--color-ink)] focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Key Formula (LaTeX) */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-mono font-medium text-[var(--color-ink)]">
              Anchor Mathematical Formula (LaTeX)
            </label>
            <input
              type="text"
              value={keyFormulaLatex}
              onChange={e => setKeyFormulaLatex(e.target.value)}
              placeholder="e.g. \text{Attention}(Q, K, V) = \text{softmax}(QK^T / \sqrt{d_k})V"
              className="px-3 py-2 text-xs font-mono rounded-lg border border-[var(--color-rule)] bg-[var(--color-surface)] text-[var(--color-ink)] focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Title */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-mono font-medium text-[var(--color-ink)]">
              Unit Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Spectral Norms, Lipschitz Bounds & Stable Residual Dynamics"
              className="px-3 py-2 text-xs rounded-lg border border-[var(--color-rule)] bg-[var(--color-surface)] text-[var(--color-ink)] focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-mono font-medium text-[var(--color-ink)]">
              Core Mathematical Motivation & Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Why this mathematics matters for modern LLM architecture, stability, or scaling..."
              className="px-3 py-2 text-xs rounded-lg border border-[var(--color-rule)] bg-[var(--color-surface)] text-[var(--color-ink)] focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-y"
            />
          </div>

          {/* Category & Difficulty */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-mono font-medium text-[var(--color-ink)]">
                Research Category
              </label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value as LearningUnit['category'])}
                className="px-3 py-2 text-xs rounded-lg border border-[var(--color-rule)] bg-[var(--color-surface)] text-[var(--color-ink)] focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                {CATEGORIES.map(c => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-mono font-medium text-[var(--color-ink)]">
                Cognitive Complexity / Difficulty
              </label>
              <select
                value={difficulty}
                onChange={e => setDifficulty(e.target.value as LearningUnit['difficulty'])}
                className="px-3 py-2 text-xs rounded-lg border border-[var(--color-rule)] bg-[var(--color-surface)] text-[var(--color-ink)] focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="Foundational">Foundational</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
                <option value="Research Frontier">Research Frontier</option>
              </select>
            </div>
          </div>

          {/* Mathematical Sub-Fields */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-mono font-medium text-[var(--color-ink)]">
              Underlying Mathematical Disciplines
            </label>
            <div className="flex flex-wrap gap-1.5">
              {MATH_FIELDS.map(field => {
                const isSelected = mathFields.includes(field);
                return (
                  <button
                    key={field}
                    type="button"
                    onClick={() => handleToggleMathField(field)}
                    className={`px-2.5 py-1 rounded text-[0.6875rem] font-mono transition-colors ${
                      isSelected
                        ? 'bg-emerald-600 text-white font-medium'
                        : 'bg-[var(--color-paper)] border border-[var(--color-rule)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
                    }`}
                  >
                    {field}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tags */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-mono font-medium text-[var(--color-ink)]">
              Topic Tags
            </label>
            <div className="flex flex-wrap gap-1.5 mb-1.5">
              {tags.map(tag => (
                <span
                  key={tag}
                  className="px-2 py-0.5 rounded text-xs font-mono bg-[var(--color-paper)] border border-[var(--color-rule)] text-[var(--color-ink)] flex items-center gap-1"
                >
                  <span>#{tag}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="text-[var(--color-ink-muted)] hover:text-rose-500"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                placeholder="Add tag (e.g. attention, softmax, loss-landscape)..."
                className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-[var(--color-rule)] bg-[var(--color-surface)] text-[var(--color-ink)] focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="px-3 py-1.5 rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper)] text-xs text-[var(--color-ink)] hover:bg-[var(--color-surface)]"
              >
                Add Tag
              </button>
            </div>
          </div>

          {/* Prerequisites */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-mono font-medium text-[var(--color-ink)]">
              Prerequisites
            </label>
            <div className="flex flex-wrap gap-1.5 mb-1.5">
              {prerequisites.map(prereq => (
                <span
                  key={prereq}
                  className="px-2 py-0.5 rounded text-xs font-mono bg-[var(--color-paper)] border border-[var(--color-rule)] text-[var(--color-ink)] flex items-center gap-1"
                >
                  <span>{prereq}</span>
                  <button
                    type="button"
                    onClick={() => handleRemovePrereq(prereq)}
                    className="text-[var(--color-ink-muted)] hover:text-rose-500"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={prereqInput}
                onChange={e => setPrereqInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddPrereq())}
                placeholder="Add prerequisite (e.g. Multivariable Calculus, SVD)..."
                className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-[var(--color-rule)] bg-[var(--color-surface)] text-[var(--color-ink)] focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <button
                type="button"
                onClick={handleAddPrereq}
                className="px-3 py-1.5 rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper)] text-xs text-[var(--color-ink)] hover:bg-[var(--color-surface)]"
              >
                Add Prerequisite
              </button>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-[var(--color-rule)] flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg border border-[var(--color-rule)] text-xs text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs shadow-xs"
            >
              {unit ? 'Save Changes' : 'Create Unit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
