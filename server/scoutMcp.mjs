const PROTOCOL_VERSION = '2025-06-18';
const SERVER_INFO = { name: 'thinking-os-scout', version: '0.1.0' };
const BRIEF_PROPERTIES = {
  question: { type: 'string', description: 'The research question or information need.' },
  purpose: { type: 'string', description: 'The decision or research activity the papers should support.' },
  scope: { type: 'array', items: { type: 'string' } },
  exclusions: { type: 'array', items: { type: 'string' } },
  constraints: { type: 'array', items: { type: 'string' } },
  searchDirections: {
    type: 'array', minItems: 1, maxItems: 12,
    items: { type: 'object', additionalProperties: false, required: ['query', 'reason'], properties: {
      query: { type: 'string' }, reason: { type: 'string' }
    } }
  },
  screeningCriteria: { type: 'array', items: { type: 'string' } },
  maxRecommendations: { type: 'integer', minimum: 1, maximum: 5 },
  sourceReference: { type: 'string', description: 'A short reference to the assistant discussion that produced this brief.' }
};
const BRIEF_REQUIRED = ['question', 'purpose', 'scope', 'exclusions', 'constraints', 'searchDirections', 'screeningCriteria', 'maxRecommendations'];
const TOOLS = [
  {
    name: 'propose_scout_brief',
    description: 'Create a durable, editable paper-scouting brief. This does not start external retrieval; the user must press Run scout on the visible card.',
    inputSchema: { type: 'object', additionalProperties: false, required: BRIEF_REQUIRED, properties: BRIEF_PROPERTIES }
  },
  {
    name: 'revise_scout_brief',
    description: 'Replace the editable fields of an existing scout brief. This does not start a scout run.',
    inputSchema: { type: 'object', additionalProperties: false, required: ['briefId', ...BRIEF_REQUIRED], properties: {
      briefId: { type: 'string' }, ...BRIEF_PROPERTIES
    } }
  },
  {
    name: 'start_scout_run',
    description: 'Prepare the visible run control for a scout brief. This tool never starts retrieval; explicit user activation of Run scout is required.',
    inputSchema: { type: 'object', additionalProperties: false, required: ['briefId'], properties: { briefId: { type: 'string' } } }
  },
  {
    name: 'get_scout_run',
    description: 'Inspect a scout brief and its most recent detached run and report state.',
    inputSchema: { type: 'object', additionalProperties: false, required: ['briefId'], properties: { briefId: { type: 'string' } } }
  },
  {
    name: 'cancel_scout_run',
    description: 'Cancel the active detached run for a brief after the user explicitly asks to cancel it.',
    inputSchema: { type: 'object', additionalProperties: false, required: ['briefId'], properties: { briefId: { type: 'string' } } }
  },
  {
    name: 'open_scout_report',
    description: 'Return the scout card for a completed report so the user can open the durable Discovery report.',
    inputSchema: { type: 'object', additionalProperties: false, required: ['reportId'], properties: { reportId: { type: 'string' } } }
  }
];

function object(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be an object.`);
  return value;
}

function briefInput(argumentsValue) {
  const input = object(argumentsValue, 'arguments');
  return {
    question: input.question, purpose: input.purpose, scope: input.scope, exclusions: input.exclusions, constraints: input.constraints,
    searchDirections: input.searchDirections, screeningCriteria: input.screeningCriteria, maxRecommendations: input.maxRecommendations,
    createdFrom: { kind: 'assistant', reference: typeof input.sourceReference === 'string' && input.sourceReference.trim() ? input.sourceReference.trim() : 'assistant discussion' },
    author: 'model:assistant'
  };
}

async function api(origin, root, body, request = fetch) {
  const response = await request(`${origin}/api/scouts?${new URLSearchParams({ dir: root })}`, body ? {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body)
  } : undefined);
  const payload = await response.json();
  if (!response.ok) throw new Error(typeof payload?.error === 'string' ? payload.error : `Scout request failed (${response.status}).`);
  return object(payload, 'scout response');
}

function latestForBrief(state, briefId) {
  const runs = state.runs.filter(run => run.source?.kind === 'brief' && run.source.id === briefId).sort((first, second) => second.startedAt - first.startedAt);
  const run = runs[0];
  return { run, report: run?.reportId ? state.reports.find(report => report.id === run.reportId) : undefined };
}

function toolResult(brief, run, report, message) {
  return {
    content: [{ type: 'text', text: message ?? (run
      ? `Scout brief ${brief.id} has latest run ${run.state}. The visible card remains the control surface.`
      : `Scout brief ${brief.id} is ready for user review. External retrieval has not started.`) }],
    structuredContent: { kind: 'scout-brief', briefId: brief.id }
  };
}

export async function callScoutTool(root, origin, name, argumentsValue, request = fetch) {
  const input = object(argumentsValue, 'arguments');
  if (name === 'propose_scout_brief') {
    const result = await api(origin, root, { action: 'save-brief', brief: briefInput(input) }, request);
    return toolResult(result.brief);
  }
  if (name === 'revise_scout_brief') {
    const result = await api(origin, root, { action: 'save-brief', id: input.briefId, brief: briefInput(input) }, request);
    const state = await api(origin, root, undefined, request);
    const { run, report } = latestForBrief(state, result.brief.id);
    return toolResult(result.brief, run, report);
  }
  const state = await api(origin, root, undefined, request);
  const brief = name === 'open_scout_report'
    ? state.briefs.find(item => state.reports.find(report => report.id === input.reportId)?.source?.id === item.id)
    : state.briefs.find(item => item.id === input.briefId);
  if (!brief) throw new Error('Scout brief not found.');
  const { run, report } = latestForBrief(state, brief.id);
  if (name === 'start_scout_run') return toolResult(brief, run, report, 'The scout is ready. The user must press Run scout on the visible card to approve external retrieval.');
  if (name === 'get_scout_run' || name === 'open_scout_report') return toolResult(brief, run, report);
  if (name === 'cancel_scout_run') {
    if (!run || ['completed', 'partial', 'failed', 'cancelled', 'interrupted'].includes(run.state)) throw new Error('No active scout run exists for this brief.');
    await api(origin, root, { action: 'cancel-run', id: run.id }, request);
    return toolResult(brief, { ...run, state: 'cancelling' }, report, 'Scout cancellation was requested. A completed partial report remains durable when available.');
  }
  throw new Error(`Unknown scout tool: ${name}`);
}

function response(id, result) { return { jsonrpc: '2.0', id, result }; }
function errorResponse(id, code, message) { return { jsonrpc: '2.0', id, error: { code, message } }; }

export async function handleScoutMcpMessage(root, origin, message, request = fetch) {
  if (!message || message.jsonrpc !== '2.0') return errorResponse(message?.id ?? null, -32600, 'Invalid JSON-RPC request.');
  if (message.method === 'notifications/initialized') return null;
  if (message.method === 'initialize') return response(message.id, { protocolVersion: PROTOCOL_VERSION, capabilities: { tools: {} }, serverInfo: SERVER_INFO,
    instructions: 'Create or revise scout briefs only. Never claim a run started; the user must use the visible Run scout action.' });
  if (message.method === 'tools/list') return response(message.id, { tools: TOOLS });
  if (message.method === 'tools/call') {
    try {
      const params = object(message.params, 'tools/call params');
      if (typeof params.name !== 'string') throw new Error('tools/call requires a tool name.');
      return response(message.id, await callScoutTool(root, origin, params.name, params.arguments ?? {}, request));
    } catch (error) {
      return response(message.id, { isError: true, content: [{ type: 'text', text: error instanceof Error ? error.message : String(error) }] });
    }
  }
  if (message.id === undefined) return null;
  return errorResponse(message.id, -32601, `Method not found: ${message.method}`);
}

function write(message) { if (message) process.stdout.write(`${JSON.stringify(message)}\n`); }

async function main() {
  const root = process.argv[2];
  const origin = process.argv[3];
  if (!root || !origin || !/^http:\/\/(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(origin)) throw new Error('Scout MCP requires a local workspace and origin.');
  process.stdin.setEncoding('utf8');
  let buffer = '';
  for await (const chunk of process.stdin) {
    buffer += chunk;
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (!line.trim()) continue;
      try { write(await handleScoutMcpMessage(root, origin, JSON.parse(line))); }
      catch (error) { write(errorResponse(null, -32700, error instanceof Error ? error.message : String(error))); }
    }
  }
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  main().catch(error => { process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`); process.exitCode = 1; });
}
