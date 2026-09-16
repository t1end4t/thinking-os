import {
  Claim,
  Link,
  Reproduction,
  AlternativeExplanation,
  Experiment,
  ClaimLifecycleState
} from '../types';

/**
 * Derives the trust lifecycle state for a claim strictly based on its links,
 * reproductions, alternative explanations, and experiment records.
 * States are descriptive and derived, never manually typed by the user.
 */
export function getClaimLifecycleState(
  claim: Claim,
  allClaims: Claim[] = [],
  reproductions: Reproduction[] = [],
  alternatives: AlternativeExplanation[] = [],
  experiments: Experiment[] = []
): ClaimLifecycleState {
  // 1. Rejected: failure threshold was met or explicitly marked rejected
  if (claim.rejected || Boolean(claim.rejectionReason?.trim())) {
    return 'rejected';
  }

  // 2. Narrowed: superseded by a successor claim (retains record as parent)
  const isSuperseeded =
    Boolean(claim.successorClaimId) ||
    allClaims.some(other => other.parentClaimId === claim.id);
  if (isSuperseeded) {
    return 'narrowed';
  }

  const claimAlts = alternatives.filter(alt => alt.claimId === claim.id);

  // 3. Contested: at least one open Alternative Explanation is attached
  const hasOpenAlternative = claimAlts.some(alt => alt.state === 'open');
  if (hasOpenAlternative) {
    return 'contested';
  }

  // 4. Defended: every attached Alternative Explanation is removed by a Control, and scope limits are written
  const hasAlternatives = claimAlts.length > 0;
  const allAlternativesRemoved =
    hasAlternatives &&
    claimAlts.every(alt => alt.state === 'removed_by_control');
  const hasScopeLimits = Boolean(claim.scopeLimits && claim.scopeLimits.trim().length > 0);

  if (allAlternativesRemoved && hasScopeLimits) {
    return 'defended';
  }

  // 5. Instrumented: a Reproduction record exists (baseline identity, published number, reproduced number, gap)
  // or a linked experiment serves as the reproduction instrument
  const hasReproduction = reproductions.some(
    r =>
      r.claimId === claim.id &&
      Boolean(r.baselineIdentity?.trim()) &&
      r.reproducedNumber !== undefined &&
      r.reproducedNumber !== ''
  );
  const hasInstrumentExperiment = experiments.some(
    exp =>
      exp.claimId === claim.id &&
      exp.baseline &&
      exp.baseline.trim().length > 0 &&
      exp.status === 'done'
  );

  if (hasReproduction || hasInstrumentExperiment) {
    return 'instrumented';
  }

  // 6. Committed: prediction and failure threshold written, before any linked experiment leaves Planned
  const hasPredictionAndThreshold = Boolean(
    claim.prediction?.trim() && claim.failureThreshold?.trim()
  );
  if (hasPredictionAndThreshold) {
    return 'committed';
  }

  // 7. Candidate: default initial state (promoted from Survey or Learn)
  return 'candidate';
}

export interface ClaimStateCounts {
  candidate: number;
  committed: number;
  instrumented: number;
  contested: number;
  defended: number;
  narrowed: number;
  rejected: number;
  retired: number;
}

export function computeClaimStateCounts(
  claims: Claim[],
  reproductions: Reproduction[] = [],
  alternatives: AlternativeExplanation[] = [],
  experiments: Experiment[] = [],
  retiredSurveyCount: number = 0
): ClaimStateCounts {
  const counts: ClaimStateCounts = {
    candidate: 0,
    committed: 0,
    instrumented: 0,
    contested: 0,
    defended: 0,
    narrowed: 0,
    rejected: 0,
    retired: retiredSurveyCount
  };

  for (const claim of claims) {
    const state = getClaimLifecycleState(
      claim,
      claims,
      reproductions,
      alternatives,
      experiments
    );
    counts[state]++;
    if (state === 'rejected') {
      counts.retired++;
    }
  }

  return counts;
}

export interface StateConfig {
  label: string;
  badgeClass: string;
  dotClass: string;
  description: string;
}

export const CLAIM_STATE_CONFIGS: Record<ClaimLifecycleState | 'retired', StateConfig> = {
  candidate: {
    label: 'Candidate',
    badgeClass: 'bg-[var(--color-paper)] text-[var(--color-ink-muted)] border-[var(--color-rule)]',
    dotClass: 'bg-[var(--color-ink-muted)]',
    description: 'Promoted candidate claim. Falsifiable, settleable within one year.'
  },
  committed: {
    label: 'Committed',
    badgeClass: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/60',
    dotClass: 'bg-indigo-500',
    description: 'Prediction and failure threshold committed prior to empirical runs.'
  },
  instrumented: {
    label: 'Instrumented',
    badgeClass: 'bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800/60',
    dotClass: 'bg-teal-500',
    description: 'Baseline instrument reproduced with published number and evaluated gap.'
  },
  contested: {
    label: 'Contested',
    badgeClass: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60',
    dotClass: 'bg-amber-500',
    description: 'Under attack: at least one competing Alternative Explanation is active.'
  },
  defended: {
    label: 'Defended',
    badgeClass: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60',
    dotClass: 'bg-emerald-500',
    description: 'All competing alternatives dismantled by controls; explicit scope limits defined.'
  },
  narrowed: {
    label: 'Narrowed',
    badgeClass: 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800/60',
    dotClass: 'bg-purple-500',
    description: 'Refined and superseded by a successor claim. Preserves parent intellectual lineage.'
  },
  rejected: {
    label: 'Rejected',
    badgeClass: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/60',
    dotClass: 'bg-rose-500',
    description: 'Failure threshold was met. Preserved permanently to prevent repeated mistakes.'
  },
  retired: {
    label: 'Retired',
    badgeClass: 'bg-stone-100 dark:bg-stone-900 text-stone-600 dark:text-stone-400 border-stone-300 dark:border-stone-700',
    dotClass: 'bg-stone-500',
    description: 'Retired problems, notes, and discarded hypotheses with documented rationale.'
  }
};
