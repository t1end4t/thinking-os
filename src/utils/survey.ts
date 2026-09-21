import type { SurveyCandidateQuestion, SurveyOpenProblem, SurveyProblemLink } from '../types';

export function normalizeSurvey(openProblems: SurveyOpenProblem[], candidates: SurveyCandidateQuestion[]) {
  const candidateQuestions = candidates.map(candidate => {
    const legacyIds = [...new Set([
      ...candidate.openProblemIds,
      ...openProblems.filter(problem => problem.candidateId === candidate.id).map(problem => problem.id)
    ])];
    const problemLinks = candidate.problemLinks ?? legacyIds.map(problemId => ({
      id: `legacy-${candidate.id}-${problemId}`,
      problemId,
      userReason: 'Preserved from the existing survey grouping; the original reason was not recorded.',
      createdAt: candidate.createdAt,
      author: 'system' as const,
      legacy: true
    }));
    return { ...candidate, problemLinks, openProblemIds: problemLinks.map(link => link.problemId) };
  });
  return {
    openProblems: openProblems.map(problem => {
      const { candidateId: _legacyCandidateId, ...record } = problem;
      return record;
    }),
    candidateQuestions
  };
}

export function linkSurveyProblems(candidate: SurveyCandidateQuestion, problemIds: string[], userReason: string) {
  if (!userReason.trim()) throw new Error('Explain why these problems matter to this question.');
  const existing = candidate.problemLinks ?? [];
  const additions: SurveyProblemLink[] = [...new Set(problemIds)]
    .filter(problemId => !existing.some(link => link.problemId === problemId))
    .map(problemId => ({ id: crypto.randomUUID(), problemId, userReason: userReason.trim(), createdAt: Date.now(), author: 'user' }));
  const problemLinks = [...existing, ...additions];
  return { ...candidate, problemLinks, openProblemIds: problemLinks.map(link => link.problemId) };
}

export function unlinkSurveyProblem(candidate: SurveyCandidateQuestion, problemId: string) {
  const problemLinks = (candidate.problemLinks ?? []).filter(link => link.problemId !== problemId);
  return { ...candidate, problemLinks, openProblemIds: problemLinks.map(link => link.problemId) };
}
