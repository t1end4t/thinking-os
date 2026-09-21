import type { Evidence, Experiment, ExperimentArtifact, Paper } from '../types';

export type EvidenceSource =
  | { kind: 'paper'; paper: Paper }
  | { kind: 'experiment'; experiment: Experiment; artifact?: ExperimentArtifact }
  | { kind: 'reasoning' }
  | { kind: 'missing'; message: string };

export function getEvidenceSource(evidence: Evidence, papers: Paper[], experiments: Experiment[]): EvidenceSource {
  if (evidence.origin === 'own_reasoning') return { kind: 'reasoning' };
  if (evidence.origin === 'literature') {
    const paper = papers.find(item => item.id === evidence.paperId);
    if (paper) return { kind: 'paper', paper };
    return {
      kind: 'missing',
      message: evidence.paperId ? 'The linked paper is unavailable.' : 'No source linked. Choose a paper.'
    };
  }
  const experiment = experiments.find(item => item.id === evidence.experimentId);
  if (!experiment) {
    return {
      kind: 'missing',
      message: evidence.experimentId ? 'The linked experiment is unavailable.' : 'No source linked. Choose an experiment.'
    };
  }
  const artifact = experiment.artifacts.find(item => item.id === evidence.artifactId);
  if (evidence.artifactId && !artifact) {
    return { kind: 'missing', message: 'The linked artifact is unavailable. Choose another artifact.' };
  }
  return { kind: 'experiment', experiment, artifact };
}
