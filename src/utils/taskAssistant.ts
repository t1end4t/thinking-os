import { TaskItem, TaskPriority, TaskStatus } from '../productivityTypes';

export interface ParsedTaskIntent {
  isMatch: boolean;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  tag: string;
  description: string;
}

export interface TaskDraftData {
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  tag: string;
  isAiDrafted: boolean;
}

/**
 * Parses user text to detect direct task creation intent (Case 1)
 */
export function parseTaskCreateIntent(rawText: string): ParsedTaskIntent | null {
  const text = rawText.trim();
  const lower = text.toLowerCase();

  // Triggers for task creation
  const createKeywords = [
    'create task',
    'add task',
    'new task',
    'create card',
    'add card',
    'make task',
    'insert task'
  ];

  const matchedKeyword = createKeywords.find(kw => lower.includes(kw));
  if (!matchedKeyword) return null;

  // Extract status / column
  let status: TaskStatus = 'todo';
  if (lower.includes('backlog')) {
    status = 'backlog';
  } else if (lower.includes('in-progress') || lower.includes('in progress') || lower.includes('doing') || lower.includes('active')) {
    status = 'in-progress';
  } else if (lower.includes('review') || lower.includes('evaluating') || lower.includes('inspect')) {
    status = 'review';
  } else if (lower.includes('done') || lower.includes('completed') || lower.includes('finished')) {
    status = 'done';
  } else if (lower.includes('todo') || lower.includes('to do') || lower.includes('to-do')) {
    status = 'todo';
  }

  // Extract priority
  let priority: TaskPriority = 'medium';
  if (lower.includes('urgent') || lower.includes('critical') || lower.includes('p0')) {
    priority = 'urgent';
  } else if (lower.includes('high') || lower.includes('p1')) {
    priority = 'high';
  } else if (lower.includes('low') || lower.includes('minor') || lower.includes('p3')) {
    priority = 'low';
  }

  // Extract tag
  let tag = 'task';
  const tagMatch = text.match(/#(\w+)|tag[:\s]+([\w-]+)/i);
  if (tagMatch) {
    tag = tagMatch[1] || tagMatch[2] || 'task';
  } else if (lower.includes('paper') || lower.includes('research') || lower.includes('literature')) {
    tag = 'research';
  } else if (lower.includes('model') || lower.includes('weights') || lower.includes('llm')) {
    tag = 'model';
  } else if (lower.includes('benchmark') || lower.includes('latency') || lower.includes('kernel') || lower.includes('perf')) {
    tag = 'perf';
  } else if (lower.includes('bug') || lower.includes('fix') || lower.includes('error')) {
    tag = 'bug';
  }

  // Extract title: remove the keyword and trailing status/priority clauses
  const kwIndex = lower.indexOf(matchedKeyword);
  let remainder = text.slice(kwIndex + matchedKeyword.length).trim();

  // Strip leading colons, hyphens, or prepositions
  remainder = remainder.replace(/^[:\-–—\s]+/, '');
  remainder = remainder.replace(/^(in|to|for|about|into|on)\s+/i, '');

  // Strip trailing "in backlog", "to todo", "priority high", etc.
  let cleanedTitle = remainder
    .replace(/\s+(in|to|into|on)\s+(backlog|todo|to do|in-progress|in progress|review|done)/gi, '')
    .replace(/\s+(priority|prio)\s+(urgent|high|medium|low)/gi, '')
    .replace(/\s*#\w+/g, '')
    .replace(/\s*tag[:\s]+[\w-]+/gi, '')
    .trim();

  // Clean trailing punctuation
  cleanedTitle = cleanedTitle.replace(/[.,;:]+$/, '').trim();

  if (!cleanedTitle) {
    cleanedTitle = 'New Task created by Assistant';
  }

  // Capitalize first letter
  cleanedTitle = cleanedTitle.charAt(0).toUpperCase() + cleanedTitle.slice(1);

  const description = `Created by Assistant based on prompt: "${text}"\n\n• Objective: ${cleanedTitle}\n• Target column: ${status.toUpperCase()}\n• Priority: ${priority.toUpperCase()}\n• Provenance: AI-generated.`;

  return {
    isMatch: true,
    title: cleanedTitle,
    status,
    priority,
    tag,
    description
  };
}

/**
 * Checks if user is asking the assistant to draft / fill the editor (Case 2)
 */
export function isTaskDraftIntent(rawText: string): boolean {
  const lower = rawText.toLowerCase();
  const draftKeywords = [
    'draft task',
    'auto-fill',
    'autofill',
    'fill editor',
    'fill the form',
    'fill in the form',
    'suggest description',
    'write description',
    'draft description',
    'suggest checklist',
    'acceptance criteria',
    'enrich task'
  ];
  return draftKeywords.some(kw => lower.includes(kw));
}

/**
 * Generates an intelligent draft for a task based on current task info or user prompt (Case 2)
 */
export function generateAiTaskDraft(
  prompt: string,
  existingTask?: TaskItem | null,
  targetStatus: TaskStatus = 'todo'
): TaskDraftData {
  const promptLower = prompt.toLowerCase();
  const baseTitle = existingTask?.title || prompt
    .replace(/^(please|can you|help|draft|fill|suggest|write|generate|auto-fill)\s+/gi, '')
    .replace(/(for this task|in editor|into editor|the task description|the form)/gi, '')
    .trim() || 'System Architecture & Optimization Benchmark';

  // Format a clean title
  let title = baseTitle.replace(/^[.,:;\-\s]+/, '').trim();
  if (title.length > 80) title = title.slice(0, 77) + '...';
  title = title.charAt(0).toUpperCase() + title.slice(1);

  // Determine tag & priority
  let tag = existingTask?.tag || 'research';
  let priority: TaskPriority = existingTask?.priority || 'medium';

  if (promptLower.includes('urgent') || promptLower.includes('critical') || promptLower.includes('p0')) {
    priority = 'urgent';
  } else if (promptLower.includes('high') || promptLower.includes('p1')) {
    priority = 'high';
  }

  if (promptLower.includes('paper') || promptLower.includes('literature')) tag = 'literature';
  else if (promptLower.includes('quant') || promptLower.includes('vram') || promptLower.includes('gpu')) tag = 'runtime';
  else if (promptLower.includes('eval') || promptLower.includes('benchmark')) tag = 'benchmark';
  else if (promptLower.includes('service') || promptLower.includes('api')) tag = 'backend';

  const descLines = [
    `### Objective (AI Drafted)`,
    `${title}.`,
    ``,
    `### Acceptance Criteria`,
    `- [ ] Gather and analyze relevant reference materials and constraints`,
    `- [ ] Execute verification benchmarks and record experimental metrics (Latency, VRAM, Throughput)`,
    `- [ ] Document findings into corresponding Artifacts & Evidence cards`,
    `- [ ] Review execution state and update Kanban column`,
    ``,
    `### Additional Notes`,
    `Drafted automatically by AI Assistant. Verify parameters and click "Save".`
  ];

  return {
    title,
    description: descLines.join('\n'),
    status: existingTask?.status || targetStatus,
    priority,
    tag,
    isAiDrafted: true
  };
}
