import {
  CardBlock,
  CognitiveLevelId,
  LearnBlock,
  LearnSource,
  LearnSourceKind,
  LearningUnit,
  COGNITIVE_LEVEL_ORDER
} from '../learnTypes';

export const DAY_MS = 86_400_000;

/** Leitner boxes: a missed card drops to box 0, a recalled card moves up one. */
export const REVIEW_STEPS_DAYS = [0, 1, 3, 7, 16, 35];

export function scheduleCard(card: CardBlock, recalled: boolean, at = Date.now()): CardBlock {
  const box = recalled ? Math.min(card.box + 1, REVIEW_STEPS_DAYS.length - 1) : 0;
  return { ...card, box, dueAt: at + REVIEW_STEPS_DAYS[box] * DAY_MS, updatedAt: at };
}

export function isCard(block: LearnBlock): block is CardBlock {
  return block.kind === 'card';
}

export function dueCards(units: LearningUnit[], at = Date.now()): Array<{ unit: LearningUnit; card: CardBlock }> {
  return units
    .flatMap(unit => unit.blocks.filter(isCard).map(card => ({ unit, card })))
    .filter(entry => entry.card.dueAt <= at)
    .sort((a, b) => a.card.dueAt - b.card.dueAt);
}

export function levelCoverage(unit: LearningUnit): Record<CognitiveLevelId, number> {
  const counts = Object.fromEntries(COGNITIVE_LEVEL_ORDER.map(level => [level, 0])) as Record<CognitiveLevelId, number>;
  for (const block of unit.blocks) counts[block.level] += 1;
  return counts;
}

const SOURCE_KINDS: LearnSourceKind[] = ['book', 'video', 'paper', 'course', 'note'];

function normalizeSource(raw: unknown, fallbackTitle: string): LearnSource {
  const value = (raw ?? {}) as Partial<LearnSource>;
  const kind = SOURCE_KINDS.includes(value.kind as LearnSourceKind) ? (value.kind as LearnSourceKind) : 'note';
  return {
    kind,
    title: value.title?.trim() || fallbackTitle,
    ...(value.url ? { url: value.url } : {})
  };
}

/**
 * Vault units written before the visual redesign lack `source` and `blocks`
 * but carry level payloads we no longer render. Extra keys pass through so
 * the snapshot write does not erase them.
 */
export function normalizeLearningUnit(raw: LearningUnit): LearningUnit {
  const legacyBook = raw.book?.trim();
  return {
    ...raw,
    tags: Array.isArray(raw.tags) ? raw.tags : [],
    blocks: Array.isArray(raw.blocks) ? raw.blocks : [],
    source: normalizeSource(raw.source, legacyBook || raw.title || 'Untitled source')
  };
}
